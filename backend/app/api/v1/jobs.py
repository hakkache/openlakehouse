import uuid
from datetime import datetime, timezone

from croniter import croniter
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import dagster_client
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.pipeline import Pipeline, PipelineRun
from app.schemas.jobs import JobsStatus, PipelineSummary, RunInfo, ScheduledPipelineInfo, TriggerRunResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _next_run_at(cron: str) -> datetime | None:
    try:
        return croniter(cron, datetime.now(timezone.utc)).get_next(datetime)
    except (ValueError, KeyError):
        return None


@router.get("/status", response_model=JobsStatus)
def get_jobs_status(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)) -> JobsStatus:
    """Real Dagster run status (via GraphQL) joined with our own saved pipelines and
    their `schedule` cron field - no simulated data."""
    settings = get_settings()
    pipelines = list(db.scalars(select(Pipeline).order_by(Pipeline.updated_at.desc())))

    scheduled: list[ScheduledPipelineInfo] = []
    unscheduled: list[PipelineSummary] = []
    for p in pipelines:
        cron = (p.definition or {}).get("schedule")
        if cron:
            scheduled.append(
                ScheduledPipelineInfo(pipeline_id=str(p.id), name=p.name, schedule=cron, next_run_at=_next_run_at(cron))
            )
        else:
            unscheduled.append(PipelineSummary(pipeline_id=str(p.id), name=p.name))

    if not dagster_client.is_available():
        return JobsStatus(
            available=False,
            scheduled_pipelines=scheduled,
            unscheduled_pipelines=unscheduled,
            recent_runs=[],
            dagster_url=settings.dagster_public_url,
        )

    raw_runs = dagster_client.list_recent_runs()
    dagster_run_ids = [r["runId"] for r in raw_runs if r.get("runId")]
    linked_by_dagster_id: dict[str, PipelineRun] = {}
    if dagster_run_ids:
        linked_by_dagster_id = {
            pr.dagster_run_id: pr
            for pr in db.scalars(select(PipelineRun).where(PipelineRun.dagster_run_id.in_(dagster_run_ids)))
        }
    pipeline_names = {str(p.id): p.name for p in pipelines}

    runs = [
        RunInfo(
            run_id=r["runId"],
            job_name=r.get("jobName", ""),
            status=r.get("status", ""),
            start_time=r.get("startTime"),
            end_time=r.get("endTime"),
            pipeline_id=(str(local.pipeline_id) if (local := linked_by_dagster_id.get(r.get("runId"))) else None),
            pipeline_name=(pipeline_names.get(str(local.pipeline_id)) if local else None),
            local_run_id=(str(local.id) if local else None),
        )
        for r in raw_runs
    ]

    return JobsStatus(
        available=True,
        scheduled_pipelines=scheduled,
        unscheduled_pipelines=unscheduled,
        recent_runs=runs,
        dagster_url=settings.dagster_public_url,
    )


@router.post("/pipelines/{pipeline_id}/trigger", response_model=TriggerRunResponse, status_code=202)
def trigger_pipeline(
    pipeline_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> TriggerRunResponse:
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    dagster_run_id = dagster_client.trigger_run(str(pipeline_id))
    if not dagster_run_id:
        raise HTTPException(status_code=502, detail="Dagster did not accept the run (is it reachable?)")
    return TriggerRunResponse(dagster_run_id=dagster_run_id)


@router.post("/runs/{dagster_run_id}/terminate", status_code=204)
def terminate_run(dagster_run_id: str, user: CurrentUser = Depends(get_current_user)) -> None:
    if not dagster_client.terminate_run(dagster_run_id):
        raise HTTPException(status_code=502, detail="Failed to terminate the run via Dagster")
