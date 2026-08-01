"""Derives table-level lineage edges from saved pipeline definitions.

A pipeline's compiled SQL always reads from `iceberg.<schema>.<table>` source
nodes and writes to `iceberg.<bronze|silver|gold>.<table>` destination nodes
(see pipeline_compiler.py). This module walks a pipeline's graph to build the
dataset-level (table -> table) lineage edges implied by each pipeline, without
needing to introspect Trino/Iceberg directly - the pipeline definition itself
is the source of truth for what reads from what.
"""

from dataclasses import dataclass

from app.core.pipeline_compiler import _DESTINATION_SCHEMA
from app.schemas.pipeline import PipelineDefinition, PipelineNode


@dataclass(frozen=True)
class LineageNode:
    id: str
    fqn: str
    kind: str  # "source" | "destination"


@dataclass(frozen=True)
class LineageEdge:
    source_fqn: str
    target_fqn: str
    pipeline_id: str
    pipeline_name: str


def _node_fqn(node: PipelineNode) -> str | None:
    if node.kind == "source" and node.type == "iceberg_table":
        schema = node.config.get("schema")
        table = node.config.get("table")
        if schema and table:
            return f"iceberg.{schema}.{table}"
        return None
    if node.kind == "destination":
        schema = _DESTINATION_SCHEMA.get(node.type)
        table = node.config.get("table")
        if schema and table:
            return f"iceberg.{schema}.{table}"
        return None
    return None


def _reachable_sources(node_id: str, nodes_by_id: dict[str, PipelineNode], edges: list) -> set[str]:
    """Walk backwards from `node_id` through transform/quality nodes to find source fqns."""
    seen: set[str] = set()
    stack = [node_id]
    visited_ids: set[str] = set()
    while stack:
        current = stack.pop()
        if current in visited_ids:
            continue
        visited_ids.add(current)
        node = nodes_by_id.get(current)
        if node is None:
            continue
        if node.kind == "source":
            fqn = _node_fqn(node)
            if fqn:
                seen.add(fqn)
            continue
        preds = [e.source for e in edges if e.target == current]
        stack.extend(preds)
    return seen


def extract_pipeline_lineage(pipeline_id: str, pipeline_name: str, defn: PipelineDefinition) -> list[LineageEdge]:
    """Returns source -> destination table edges implied by a single pipeline definition."""
    nodes_by_id = {n.id: n for n in defn.nodes}
    edges: list[LineageEdge] = []
    for node in defn.nodes:
        if node.kind != "destination":
            continue
        target_fqn = _node_fqn(node)
        if not target_fqn:
            continue
        preds = [e.source for e in defn.edges if e.target == node.id]
        for pred_id in preds:
            source_fqns = _reachable_sources(pred_id, nodes_by_id, defn.edges)
            for source_fqn in source_fqns:
                edges.append(
                    LineageEdge(
                        source_fqn=source_fqn,
                        target_fqn=target_fqn,
                        pipeline_id=pipeline_id,
                        pipeline_name=pipeline_name,
                    )
                )
    return edges
