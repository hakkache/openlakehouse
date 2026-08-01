import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ConnectionType = Literal["postgresql", "mysql", "sqlserver", "rest", "kafka", "minio", "trino"]


class ConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: ConnectionType
    config: dict = Field(default_factory=dict)
    password: str | None = None


class ConnectionUpdate(BaseModel):
    name: str | None = None
    config: dict | None = None
    password: str | None = None


class ConnectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    config: dict
    last_test_status: str | None
    last_test_message: str | None
    last_test_latency_ms: int | None
    last_tested_at: datetime | None
    created_by: str
    created_at: datetime
    updated_at: datetime


class ConnectionTestRequest(BaseModel):
    type: ConnectionType
    config: dict = Field(default_factory=dict)
    password: str | None = None


class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    latency_ms: int
