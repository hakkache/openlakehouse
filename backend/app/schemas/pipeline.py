import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

NodeKind = Literal["source", "transform", "quality", "destination"]

# Node "type" values the visual builder can offer. The compiler fully supports the
# ones documented in docs/IMPLEMENTATION_STATUS.md; others are accepted by the schema
# (so the palette can show them per spec) but rejected with a clear error at compile time.
SOURCE_TYPES = {"iceberg_table", "csv", "json", "parquet", "rest_api", "postgresql", "mysql", "sqlserver", "kafka"}
TRANSFORM_TYPES = {
    "select",
    "rename",
    "filter",
    "join",
    "union",
    "aggregate",
    "sort",
    "deduplicate",
    "cast",
    "fill_null",
    "replace",
    "derived_column",
    "window",
    "pivot",
    "unpivot",
}
QUALITY_TYPES = {"not_null", "unique", "range", "regex", "schema", "freshness", "row_count"}
DESTINATION_TYPES = {"minio", "iceberg_bronze", "iceberg_silver", "iceberg_gold", "postgresql", "kafka"}


class PipelineNode(BaseModel):
    id: str
    kind: NodeKind
    type: str
    label: str = ""
    config: dict[str, Any] = Field(default_factory=dict)
    position: dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0})


class PipelineEdge(BaseModel):
    id: str
    source: str
    target: str


class PipelineDefinition(BaseModel):
    """Mirrors the JSON pipeline schema in OPENLAKEHOUSE_SPEC.md section 18."""

    id: str | None = None
    name: str = Field(min_length=1, max_length=255)
    version: int = 1
    nodes: list[PipelineNode] = Field(default_factory=list)
    edges: list[PipelineEdge] = Field(default_factory=list)
    parameters: dict[str, Any] = Field(default_factory=dict)
    schedule: str | None = None


class PipelineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    definition: PipelineDefinition


class PipelineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    version: int
    definition: dict
    created_by: str
    created_at: datetime
    updated_at: datetime


class CompiledNode(BaseModel):
    node_id: str
    sql: str


class CompileResult(BaseModel):
    nodes: list[CompiledNode]
    full_sql: str


class NodeRunStatus(BaseModel):
    node_id: str
    status: str
    message: str | None = None
    row_count: int | None = None
    duration_ms: int | None = None


class PipelineRunStatus(BaseModel):
    id: uuid.UUID
    pipeline_id: uuid.UUID
    status: str
    error: str | None = None
    nodes: list[NodeRunStatus] = Field(default_factory=list)


class PipelineRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pipeline_id: uuid.UUID
    status: str
    error: str | None
    executed_by: str
    started_at: datetime
    finished_at: datetime | None
