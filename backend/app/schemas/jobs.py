from pydantic import BaseModel


class ScheduleInfo(BaseModel):
    name: str
    cron_schedule: str
    status: str


class JobInfo(BaseModel):
    repository: str
    name: str


class RunInfo(BaseModel):
    run_id: str
    job_name: str
    status: str
    start_time: float | None
    end_time: float | None


class JobsStatus(BaseModel):
    available: bool
    jobs: list[JobInfo]
    schedules: list[ScheduleInfo]
    recent_runs: list[RunInfo]
    dagster_url: str
