import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Engine = Literal["trino", "spark"]


class QueryRequest(BaseModel):
    sql: str = Field(min_length=1)
    engine: Engine = "trino"


class QueryStatus(BaseModel):
    id: uuid.UUID
    status: str
    engine: str = "trino"
    columns: list[str] | None = None
    rows: list[list] | None = None
    row_count: int | None = None
    duration_ms: int | None = None
    error: str | None = None


class QueryExecutionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sql_text: str
    engine: str
    status: str
    row_count: int | None
    duration_ms: int | None
    error: str | None
    executed_by: str
    created_at: datetime


class SavedQueryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    sql_text: str = Field(min_length=1)


class SavedQueryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    sql_text: str
    created_by: str
    created_at: datetime
