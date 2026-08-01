from pydantic import BaseModel


class MLExperiment(BaseModel):
    experiment_id: str
    name: str
    lifecycle_stage: str
    artifact_location: str


class MLRun(BaseModel):
    run_id: str
    experiment_id: str
    status: str
    start_time: int | None
    end_time: int | None
    params: dict[str, str]
    metrics: dict[str, float]


class MLModelVersion(BaseModel):
    version: str
    status: str
    current_stage: str
    run_id: str | None


class MLRegisteredModel(BaseModel):
    name: str
    latest_versions: list[MLModelVersion]


class MLStatus(BaseModel):
    available: bool
    experiments: list[MLExperiment]
    registered_models: list[MLRegisteredModel]
