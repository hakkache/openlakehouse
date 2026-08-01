"""Dagster user code location for OpenLakehouse pipeline orchestration.

Reuses the backend's own SQLAlchemy models, pipeline compiler, and pipeline
executor (`app.api.v1.pipelines._run_pipeline`) directly, so a Dagster-triggered
run performs the exact same real Trino execution as an API-triggered run --
no separate/fake execution path.
"""

import uuid
from datetime import datetime, timezone

from dagster import (
    Definitions,
    Failure,
    Field,
    OpExecutionContext,
    RunRequest,
    SkipReason,
    job,
    op,
    schedule,
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
            started_at=datetime.now(timezone.utc),
        )
        db.add(run)
        db.commit()
        run_id = str(run.id)
    finally:
        db.close()

    context.log.info(f"Executing pipeline {pipeline_id} via run {run_id}")
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


@schedule(cron_schedule="*/15 * * * *", job=run_pipeline_job, execution_timezone="UTC")
def all_pipelines_schedule(context):
    """Every 15 minutes, (re)run the most recently updated saved pipeline, if any.

    This is a pragmatic default schedule for the MVP: rather than requiring the
    user to hand-configure a schedule per pipeline_id up front, it picks the most
    recently saved/updated Pipeline row so the Dagster schedule/daemon path is
    exercised against real, current pipeline definitions.
    """
    db = SessionLocal()
    try:
        pipeline = db.scalar(select(Pipeline).order_by(Pipeline.updated_at.desc()).limit(1))
    finally:
        db.close()

    if not pipeline:
        return SkipReason("No saved pipelines to run")

    return RunRequest(
        run_key=None,
        run_config={"ops": {"run_pipeline_op": {"config": {"pipeline_id": str(pipeline.id)}}}},
    )


defs = Definitions(
    jobs=[run_pipeline_job],
    schedules=[all_pipelines_schedule],
)
