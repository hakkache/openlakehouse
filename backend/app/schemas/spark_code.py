import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SparkCodeRequest(BaseModel):
    code: str = Field(min_length=1)


class SparkCodeStatus(BaseModel):
    id: uuid.UUID
    status: str
    output: str | None = None
    error: str | None = None
    duration_ms: int | None = None


class SparkCodeExecutionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code_text: str
    status: str
    output: str | None
    error: str | None
    duration_ms: int | None
    executed_by: str
    created_at: datetime


class SparkCodeSessionStatus(BaseModel):
    running: bool
    idle_seconds: int | None = None
    idle_timeout_seconds: int
