from datetime import datetime

from pydantic import BaseModel


class LineageGraphNode(BaseModel):
    id: str
    label: str
    # "bronze" | "silver" | "gold" | "other" - derived from the table's schema, used by
    # the frontend to color-code nodes by medallion layer.
    layer: str
    # Latest known write status for this table, from the most recent PipelineNodeRun
    # of any destination node that writes it. None if never written by a tracked
    # pipeline run (e.g. a bronze table only ever populated by an external Spark/CDC job).
    last_status: str | None = None
    last_run_at: datetime | None = None
    last_row_count: int | None = None


class LineageGraphEdge(BaseModel):
    id: str
    source: str
    target: str
    pipeline_id: str
    pipeline_name: str


class LineageGraph(BaseModel):
    nodes: list[LineageGraphNode]
    edges: list[LineageGraphEdge]
