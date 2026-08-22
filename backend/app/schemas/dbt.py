import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class DbtModelInfo(BaseModel):
    name: str
    resource_type: str
    description: str = ""
    original_file_path: str | None = None
    schema_name: str | None = None


class DbtRunRequest(BaseModel):
    command: Literal["run", "test", "build"] = "run"
    select: str | None = None
    full_refresh: bool = False


class DbtRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    command: str
    select: str | None
    full_refresh: bool
    status: str
    return_code: int
    triggered_by: str
    started_at: datetime
    finished_at: datetime | None


class DbtRunDetail(DbtRunRead):
    stdout: str
    stderr: str


DbtElementType = Literal["model", "macro", "snapshot", "test"]


class DbtFileNode(BaseModel):
    path: str
    element_type: str
    name: str


class DbtFileContent(BaseModel):
    path: str
    content: str


class DbtFileCreateRequest(BaseModel):
    element_type: DbtElementType
    layer: Literal["staging", "intermediate", "marts"] | None = None
    name: str
    content: str
