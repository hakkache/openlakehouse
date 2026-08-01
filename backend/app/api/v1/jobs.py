from fastapi import APIRouter, Depends

from app.core import dagster_client
from app.core.config import get_settings
from app.core.security import CurrentUser, get_current_user
from app.schemas.jobs import JobInfo, JobsStatus, RunInfo, ScheduleInfo

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/status", response_model=JobsStatus)
def get_jobs_status(user: CurrentUser = Depends(get_current_user)) -> JobsStatus:
    """Real Dagster job/schedule/run status via its GraphQL API (no simulated data)."""
    settings = get_settings()
    available = dagster_client.is_available()
    if not available:
        return JobsStatus(available=False, jobs=[], schedules=[], recent_runs=[], dagster_url=settings.dagster_public_url)

    jobs: list[JobInfo] = []
    schedules: list[ScheduleInfo] = []
    for repo in dagster_client.list_jobs_and_schedules():
        for j in repo.get("jobs", []):
            jobs.append(JobInfo(repository=repo["name"], name=j["name"]))
        for s in repo.get("schedules", []):
            schedules.append(
                ScheduleInfo(
                    name=s["name"],
                    cron_schedule=s.get("cronSchedule", ""),
                    status=s.get("scheduleState", {}).get("status", "UNKNOWN"),
                )
            )

    runs = [
        RunInfo(
            run_id=r["runId"],
            job_name=r.get("jobName", ""),
            status=r.get("status", ""),
            start_time=r.get("startTime"),
            end_time=r.get("endTime"),
        )
        for r in dagster_client.list_recent_runs()
    ]

    return JobsStatus(
        available=True,
        jobs=jobs,
        schedules=schedules,
        recent_runs=runs,
        dagster_url=settings.dagster_public_url,
    )
