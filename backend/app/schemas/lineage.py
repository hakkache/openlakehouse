from pydantic import BaseModel


class LineageGraphNode(BaseModel):
    id: str
    label: str


class LineageGraphEdge(BaseModel):
    id: str
    source: str
    target: str
    pipeline_id: str
    pipeline_name: str


class LineageGraph(BaseModel):
    nodes: list[LineageGraphNode]
    edges: list[LineageGraphEdge]
