from datetime import datetime

from pydantic import BaseModel


class PipelineSummary(BaseModel):
    pipeline_id: str
    name: str


class ScheduledPipelineInfo(BaseModel):
    pipeline_id: str
    name: str
    schedule: str
    next_run_at: datetime | None = None


class RunInfo(BaseModel):
    run_id: str
    job_name: str
    status: str
    start_time: float | None
    end_time: float | None
    pipeline_id: str | None = None
    pipeline_name: str | None = None
    local_run_id: str | None = None


class JobsStatus(BaseModel):
    available: bool
    scheduled_pipelines: list[ScheduledPipelineInfo]
    unscheduled_pipelines: list[PipelineSummary]
    recent_runs: list[RunInfo]
    dagster_url: str


class TriggerRunResponse(BaseModel):
    dagster_run_id: str
