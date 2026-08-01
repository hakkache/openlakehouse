from pydantic import BaseModel


class TargetHealth(BaseModel):
    job: str
    instance: str
    up: bool


class MonitoringStatus(BaseModel):
    available: bool
    targets: list[TargetHealth]
    grafana_url: str
    prometheus_url: str
