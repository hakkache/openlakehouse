"""Dagster user code location for OpenLakehouse pipeline orchestration.

Reuses the backend's own SQLAlchemy models, pipeline compiler, and pipeline
executor (`app.api.v1.pipelines._run_pipeline`) directly, so a Dagster-triggered
run performs the exact same real Trino execution as an API-triggered run --
no separate/fake execution path.
"""

import uuid
from datetime import datetime, timezone

from croniter import CroniterBadCronError, croniter
from dagster import (
    DefaultSensorStatus,
    Definitions,
    Failure,
    Field,
    OpExecutionContext,
    RunRequest,
    SensorEvaluationContext,
    SkipReason,
    job,
    op,
    sensor,
)
from sqlalchemy import select

from app.api.v1.pipelines import _run_pipeline
from app.core.database import SessionLocal
from app.models.pipeline import Pipeline, PipelineRun


@op(config_schema={"pipeline_id": Field(str, description="UUID of the Pipeline to execute")})
def run_pipeline_op(context: OpExecutionContext) -> str:
    pipeline_id = context.op_config["pipeline_id"]
    db = SessionLocal()
    try:
        pipeline = db.get(Pipeline, uuid.UUID(pipeline_id))
        if not pipeline:
            raise Failure(f"Pipeline {pipeline_id} not found")
        definition = pipeline.definition
        run = PipelineRun(
            id=uuid.uuid4(),
            pipeline_id=pipeline.id,
            status="QUEUED",
            executed_by="dagster",
            dagster_run_id=context.run_id,
            started_at=datetime.now(timezone.utc),
        )
        db.add(run)
        db.commit()
        run_id = str(run.id)
    finally:
        db.close()

    context.log.info(f"Executing pipeline {pipeline_id} via run {run_id} (dagster run {context.run_id})")
    # Runs synchronously in this op (unlike the API's background-thread version) --
    # Dagster already gives us out-of-process, tracked, retryable execution.
    _run_pipeline(run_id, pipeline_id, definition, user="dagster")

    db = SessionLocal()
    try:
        run = db.get(PipelineRun, uuid.UUID(run_id))
        status = run.status
        error = run.error
    finally:
        db.close()

    if status != "SUCCESS":
        raise Failure(f"Pipeline run {run_id} finished with status {status}: {error}")
    return run_id


@job
def run_pipeline_job():
    run_pipeline_op()


@sensor(job=run_pipeline_job, minimum_interval_seconds=30, default_status=DefaultSensorStatus.RUNNING)
def scheduled_pipelines_sensor(context: SensorEvaluationContext):
    """Real per-pipeline scheduling: each saved Pipeline can set its own cron string in
    `PipelineDefinition.schedule` (surfaced in the Pipeline Builder's "Pipeline settings"
    panel). On every tick this checks, per pipeline, whether its cron fired since the
    last tick and - if so - launches a real run for exactly that pipeline_id. This
    replaces the earlier MVP behavior of blindly re-running "whichever pipeline was
    most recently saved" every 15 minutes.
    """
    now = datetime.now(timezone.utc)
    last_checked = datetime.fromisoformat(context.cursor) if context.cursor else now

    db = SessionLocal()
    try:
        pipelines = list(db.scalars(select(Pipeline)))
    finally:
        db.close()

    run_requests = []
    for pipeline in pipelines:
        cron = (pipeline.definition or {}).get("schedule")
        if not cron:
            continue
        try:
            next_fire = croniter(cron, last_checked).get_next(datetime)
        except (CroniterBadCronError, ValueError):
            continue
        if last_checked < next_fire <= now:
            run_requests.append(
                RunRequest(
                    run_key=f"{pipeline.id}:{next_fire.isoformat()}",
                    run_config={"ops": {"run_pipeline_op": {"config": {"pipeline_id": str(pipeline.id)}}}},
                )
            )

    context.update_cursor(now.isoformat())
    if not run_requests:
        return SkipReason("No pipeline schedules fired since last check")
    return run_requests


defs = Definitions(
    jobs=[run_pipeline_job],
    sensors=[scheduled_pipelines_sensor],
)

