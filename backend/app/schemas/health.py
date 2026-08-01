from pydantic import BaseModel


class DependencyStatus(BaseModel):
    name: str
    status: str
    detail: str | None = None


class HealthResponse(BaseModel):
    status: str
    dependencies: list[DependencyStatus]
