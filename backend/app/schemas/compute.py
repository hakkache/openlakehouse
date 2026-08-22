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


class SparkApplication(BaseModel):
    id: str
    name: str
    user: str
    cores: int
    memory_per_executor_mb: int
    submit_date: str
    state: str
    duration_ms: int
    running: bool


class TrinoComputeStatus(BaseModel):
    status: str
    version: str
    workers_total: int
    running_queries: int
    queued_queries: int
    total_queries_tracked: int


class TrinoQuery(BaseModel):
    id: str
    query: str
    user: str
    state: str
    elapsed_time: str
    queued_time: str


class JupyterStatus(BaseModel):
    status: str
    kernels_running: int
    connections: int


class JupyterKernel(BaseModel):
    id: str
    name: str
    execution_state: str
    connections: int
    last_activity: str


class ComputeStatus(BaseModel):
    spark: SparkStatus | None
    trino: TrinoComputeStatus | None
    jupyter: JupyterStatus | None
    spark_applications: list[SparkApplication] = []
    trino_queries: list[TrinoQuery] = []
    jupyter_kernels: list[JupyterKernel] = []
