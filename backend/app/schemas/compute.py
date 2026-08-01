from pydantic import BaseModel


class SparkStatus(BaseModel):
    status: str
    workers_alive: int
    workers_total: int
    cores_total: int
    cores_used: int
    memory_total_mb: int
    memory_used_mb: int
    active_apps: int
    completed_apps: int


class TrinoComputeStatus(BaseModel):
    status: str
    version: str
    workers_total: int
    running_queries: int
    queued_queries: int
    total_queries_tracked: int


class JupyterStatus(BaseModel):
    status: str
    kernels_running: int
    connections: int


class ComputeStatus(BaseModel):
    spark: SparkStatus | None
    trino: TrinoComputeStatus | None
    jupyter: JupyterStatus | None
