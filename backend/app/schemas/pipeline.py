import uuid
from datetime import datetime
from typing import Any, Literal

from croniter import croniter
from pydantic import BaseModel, ConfigDict, Field, field_validator

NodeKind = Literal[
    "source",
    "transform",
    "quality",
    "destination",
    "variable",
    "code",
    "control",
    "api_ingestion",
    "sub_pipeline",
    "dbt",
]

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

# Advanced node kinds (executed step-by-step by app.core.pipeline_executor, not
# compiled into the single-SQL-statement engine in pipeline_compiler.py). See
# pipeline_executor.py's module docstring for the execution model.
VARIABLE_TYPES = {"literal", "from_query"}
CODE_TYPES = {"sql", "python", "pyspark"}
CONTROL_TYPES = {"if", "for_each"}
API_INGESTION_TYPES = {"rest_get", "rest_post"}
SUB_PIPELINE_TYPES = {"call"}
# `select` in config is a dbt node selector (model name, `tag:x`, `path:...`, etc.).
DBT_TYPES = {"run", "test", "build"}


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

    @field_validator("schedule")
    @classmethod
    def _validate_schedule(cls, v: str | None) -> str | None:
        """Real cron validation - a per-pipeline `schedule` is picked up and executed by
        the Dagster sensor in infra/dagster/repository.py, so an invalid cron here would
        otherwise fail silently instead of failing fast at save time."""
        if v is None or not v.strip():
            return None
        v = v.strip()
        if not croniter.is_valid(v):
            raise ValueError(f"'{v}' is not a valid cron expression, e.g. '0 */6 * * *'")
        return v


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
    kind: str = ""
    type: str = ""
    sql: str = ""
    status: Literal["ok", "error"] = "ok"
    error: str | None = None


class CompileResult(BaseModel):
    nodes: list[CompiledNode]
    full_sql: str = ""
    mode: Literal["sql", "advanced"] = "sql"


class NodeRunStatus(BaseModel):
    node_id: str
    status: str
    message: str | None = None
    row_count: int | None = None
    duration_ms: int | None = None
    started_at: datetime | None = None
    sequence: int | None = None
    iteration_index: int | None = None
    parent_node_id: str | None = None


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
