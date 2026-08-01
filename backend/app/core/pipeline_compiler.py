"""Compiles a visual pipeline definition (nodes + edges) into real Trino SQL.

Design: every node becomes a CTE in a single `WITH` chain (quality nodes are the
exception - they pass their upstream data straight through and are compiled into a
separate, standalone check query built from the same CTE prefix). This keeps the
compiled output fully inspectable/downloadable as plain SQL, and keeps `compile()`
a pure function of the JSON definition with no side effects or live introspection.

Supported node types are intentionally a well-defined subset of everything listed in
OPENLAKEHOUSE_SPEC.md section 17 - see docs/IMPLEMENTATION_STATUS.md for exactly which
types are wired up to real SQL generation vs. accepted by the schema/UI but not yet
compiled.
"""

import re
from dataclasses import dataclass, field

from app.schemas.pipeline import PipelineDefinition, PipelineNode

_IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

_DESTINATION_SCHEMA = {
    "iceberg_bronze": "bronze",
    "iceberg_silver": "silver",
    "iceberg_gold": "gold",
}


class CompileError(ValueError):
    pass


def _quote_ident(name: str) -> str:
    if not _IDENT_RE.match(name):
        raise CompileError(f"Invalid identifier: {name!r}")
    return name


@dataclass
class _CompileState:
    cte_defs: list[str] = field(default_factory=list)
    alias_of: dict[str, str] = field(default_factory=dict)
    node_sql: dict[str, str] = field(default_factory=dict)
    cte_prefix_upto: dict[str, str] = field(default_factory=dict)
    destination_select_sql: dict[str, str] = field(default_factory=dict)


@dataclass
class CompiledPipeline:
    order: list[str]
    node_sql: dict[str, str]
    full_sql: str
    destination_targets: dict[str, str]
    alias_of: dict[str, str]
    cte_prefix_upto: dict[str, str]
    destination_select_sql: dict[str, str]


def _topo_sort(nodes: list[PipelineNode], edges: list) -> list[str]:
    node_ids = [n.id for n in nodes]
    if len(set(node_ids)) != len(node_ids):
        raise CompileError("Duplicate node ids in pipeline definition")

    incoming: dict[str, set[str]] = {nid: set() for nid in node_ids}
    outgoing: dict[str, set[str]] = {nid: set() for nid in node_ids}
    for e in edges:
        if e.source not in incoming or e.target not in incoming:
            raise CompileError(f"Edge references unknown node: {e.source} -> {e.target}")
        incoming[e.target].add(e.source)
        outgoing[e.source].add(e.target)

    ready = [nid for nid in node_ids if not incoming[nid]]
    order: list[str] = []
    while ready:
        nid = ready.pop(0)
        order.append(nid)
        for nxt in sorted(outgoing[nid]):
            incoming[nxt].discard(nid)
            if not incoming[nxt]:
                ready.append(nxt)
    if len(order) != len(node_ids):
        raise CompileError("Pipeline graph contains a cycle")
    return order


def _predecessors(node_id: str, edges: list) -> list[str]:
    return [e.source for e in edges if e.target == node_id]


def _compile_source(node: PipelineNode) -> str:
    if node.type != "iceberg_table":
        raise CompileError(f"Source type '{node.type}' is not yet supported by the compiler")
    schema = _quote_ident(node.config.get("schema", ""))
    table = _quote_ident(node.config.get("table", ""))
    if not schema or not table:
        raise CompileError(f"Source node {node.id} requires config.schema and config.table")
    return f"SELECT * FROM iceberg.{schema}.{table}"


def _compile_transform(node: PipelineNode, pred_alias: str, alias_of: dict[str, str]) -> str:
    cfg = node.config
    t = node.type

    if t == "select":
        columns = cfg.get("columns") or []
        if not columns:
            raise CompileError(f"select node {node.id} requires config.columns")
        cols = ", ".join(columns)
        return f"SELECT {cols} FROM {pred_alias}"

    if t == "rename":
        mapping: dict[str, str] = cfg.get("mapping") or {}
        keep: list[str] = cfg.get("keep") or []
        if not mapping and not keep:
            raise CompileError(f"rename node {node.id} requires config.mapping and/or config.keep")
        parts = [f"{old} AS {new}" for old, new in mapping.items()] + list(keep)
        return f"SELECT {', '.join(parts)} FROM {pred_alias}"

    if t == "filter":
        condition = cfg.get("condition")
        if not condition:
            raise CompileError(f"filter node {node.id} requires config.condition")
        return f"SELECT * FROM {pred_alias} WHERE {condition}"

    if t == "join":
        right_node = cfg.get("right_node")
        on = cfg.get("on")
        join_type = (cfg.get("join_type") or "inner").upper()
        if not right_node or not on:
            raise CompileError(f"join node {node.id} requires config.right_node and config.on")
        if right_node not in alias_of:
            raise CompileError(f"join node {node.id} references unknown right_node '{right_node}'")
        right_alias = alias_of[right_node]
        return f"SELECT * FROM {pred_alias} {join_type} JOIN {right_alias} ON {on}"

    if t == "union":
        union_node = cfg.get("union_node")
        if not union_node:
            raise CompileError(f"union node {node.id} requires config.union_node")
        if union_node not in alias_of:
            raise CompileError(f"union node {node.id} references unknown union_node '{union_node}'")
        other_alias = alias_of[union_node]
        return f"SELECT * FROM {pred_alias} UNION ALL SELECT * FROM {other_alias}"

    if t == "aggregate":
        group_by: list[str] = cfg.get("group_by") or []
        aggregations: dict[str, str] = cfg.get("aggregations") or {}
        if not aggregations:
            raise CompileError(f"aggregate node {node.id} requires config.aggregations")
        agg_cols = [f"{func.upper()}({col}) AS {col}_{func.lower()}" for col, func in aggregations.items()]
        select_cols = group_by + agg_cols
        sql = f"SELECT {', '.join(select_cols)} FROM {pred_alias}"
        if group_by:
            sql += f" GROUP BY {', '.join(group_by)}"
        return sql

    if t == "sort":
        columns = cfg.get("columns") or []
        if not columns:
            raise CompileError(f"sort node {node.id} requires config.columns")
        return f"SELECT * FROM {pred_alias} ORDER BY {', '.join(columns)}"

    if t == "deduplicate":
        columns: list[str] = cfg.get("columns") or []
        if columns:
            partition = ", ".join(columns)
            return (
                f"SELECT * FROM (SELECT *, ROW_NUMBER() OVER (PARTITION BY {partition} "
                f"ORDER BY {partition}) AS _rn FROM {pred_alias}) _dedup WHERE _rn = 1"
            )
        return f"SELECT DISTINCT * FROM {pred_alias}"

    if t == "cast":
        casts: dict[str, str] = cfg.get("casts") or {}
        keep: list[str] = cfg.get("keep") or []
        if not casts:
            raise CompileError(f"cast node {node.id} requires config.casts")
        parts = [f"CAST({col} AS {typ}) AS {col}" for col, typ in casts.items()] + list(keep)
        return f"SELECT {', '.join(parts)} FROM {pred_alias}"

    if t == "fill_null":
        fills: dict[str, str] = cfg.get("fills") or {}
        keep: list[str] = cfg.get("keep") or []
        if not fills:
            raise CompileError(f"fill_null node {node.id} requires config.fills")
        parts = [f"COALESCE({col}, {default}) AS {col}" for col, default in fills.items()] + list(keep)
        return f"SELECT {', '.join(parts)} FROM {pred_alias}"

    if t == "replace":
        column = cfg.get("column")
        cases: dict[str, str] = cfg.get("cases") or {}
        keep: list[str] = cfg.get("keep") or []
        if not column or not cases:
            raise CompileError(f"replace node {node.id} requires config.column and config.cases")
        when_clauses = " ".join(f"WHEN {old} THEN {new}" for old, new in cases.items())
        case_expr = f"CASE {column} {when_clauses} ELSE {column} END AS {column}"
        parts = [case_expr] + list(keep)
        return f"SELECT {', '.join(parts)} FROM {pred_alias}"

    if t in ("derived_column", "window"):
        name = cfg.get("name")
        expression = cfg.get("expression")
        if not name or not expression:
            raise CompileError(f"{t} node {node.id} requires config.name and config.expression")
        return f"SELECT *, {expression} AS {name} FROM {pred_alias}"

    if t == "pivot":
        group_by: list[str] = cfg.get("group_by") or []
        pivot_column = cfg.get("pivot_column")
        value_column = cfg.get("value_column")
        values: list[str] = cfg.get("values") or []
        agg = (cfg.get("agg") or "sum").upper()
        if not pivot_column or not value_column or not values:
            raise CompileError(f"pivot node {node.id} requires pivot_column, value_column and values")
        pivot_cols = [
            f"{agg}(CASE WHEN {pivot_column} = {v} THEN {value_column} END) AS {_quote_ident(str(v).strip(chr(39)))}"
            for v in values
        ]
        select_cols = group_by + pivot_cols
        sql = f"SELECT {', '.join(select_cols)} FROM {pred_alias}"
        if group_by:
            sql += f" GROUP BY {', '.join(group_by)}"
        return sql

    if t == "unpivot":
        id_columns: list[str] = cfg.get("id_columns") or []
        value_columns: list[str] = cfg.get("value_columns") or []
        key_name = cfg.get("key_name", "key")
        value_name = cfg.get("value_name", "value")
        if not value_columns:
            raise CompileError(f"unpivot node {node.id} requires config.value_columns")
        branches = [
            f"SELECT {', '.join(id_columns)}{', ' if id_columns else ''}"
            f"'{col}' AS {key_name}, {col} AS {value_name} FROM {pred_alias}"
            for col in value_columns
        ]
        return " UNION ALL ".join(branches)

    raise CompileError(f"Transform type '{t}' is not yet supported by the compiler")


def _compile_quality(node: PipelineNode, pred_alias: str) -> str:
    cfg = node.config
    t = node.type

    if t == "not_null":
        columns: list[str] = cfg.get("columns") or []
        if not columns:
            raise CompileError(f"not_null node {node.id} requires config.columns")
        condition = " OR ".join(f"{c} IS NULL" for c in columns)
        return f"SELECT COUNT(*) AS violations FROM {pred_alias} WHERE {condition}"

    if t == "unique":
        columns: list[str] = cfg.get("columns") or []
        if not columns:
            raise CompileError(f"unique node {node.id} requires config.columns")
        cols = ", ".join(columns)
        return (
            f"SELECT COUNT(*) AS violations FROM "
            f"(SELECT {cols}, COUNT(*) AS c FROM {pred_alias} GROUP BY {cols}) t WHERE c > 1"
        )

    if t == "range":
        column = cfg.get("column")
        if not column:
            raise CompileError(f"range node {node.id} requires config.column")
        clauses = []
        if "min" in cfg:
            clauses.append(f"{column} < {cfg['min']}")
        if "max" in cfg:
            clauses.append(f"{column} > {cfg['max']}")
        if not clauses:
            raise CompileError(f"range node {node.id} requires config.min and/or config.max")
        return f"SELECT COUNT(*) AS violations FROM {pred_alias} WHERE {' OR '.join(clauses)}"

    if t == "regex":
        column = cfg.get("column")
        pattern = cfg.get("pattern")
        if not column or not pattern:
            raise CompileError(f"regex node {node.id} requires config.column and config.pattern")
        return f"SELECT COUNT(*) AS violations FROM {pred_alias} WHERE NOT regexp_like(CAST({column} AS VARCHAR), '{pattern}')"

    if t == "row_count":
        return f"SELECT COUNT(*) AS actual FROM {pred_alias}"

    if t == "freshness":
        column = cfg.get("column")
        max_age_minutes = cfg.get("max_age_minutes")
        if not column or max_age_minutes is None:
            raise CompileError(f"freshness node {node.id} requires config.column and config.max_age_minutes")
        return (
            f"SELECT COUNT(*) AS violations FROM {pred_alias} "
            f"WHERE {column} < current_timestamp - INTERVAL '{int(max_age_minutes)}' MINUTE"
        )

    if t == "schema":
        raise CompileError("schema quality node is not yet supported by the compiler")

    raise CompileError(f"Quality type '{t}' is not yet supported by the compiler")


def _compile_destination_target(node: PipelineNode) -> str:
    schema = _DESTINATION_SCHEMA.get(node.type)
    if schema is None:
        raise CompileError(f"Destination type '{node.type}' is not yet supported by the compiler")
    table = _quote_ident(node.config.get("table", ""))
    if not table:
        raise CompileError(f"Destination node {node.id} requires config.table")
    return f"iceberg.{schema}.{table}"


def compile_pipeline(defn: PipelineDefinition) -> CompiledPipeline:
    nodes_by_id = {n.id: n for n in defn.nodes}
    order = _topo_sort(defn.nodes, defn.edges)
    state = _CompileState()
    destination_targets: dict[str, str] = {}
    last_alias: str | None = None

    for node_id in order:
        node = nodes_by_id[node_id]
        preds = _predecessors(node_id, defn.edges)

        if node.kind == "source":
            sql = _compile_source(node)
            alias = f"n_{node.id}"
            state.cte_defs.append(f"{alias} AS ({sql})")
            state.alias_of[node_id] = alias
            state.node_sql[node_id] = sql
            state.cte_prefix_upto[node_id] = "WITH " + ",\n".join(state.cte_defs)
            last_alias = alias

        elif node.kind == "transform":
            if not preds:
                raise CompileError(f"Transform node {node_id} has no upstream input")
            pred_alias = state.alias_of[preds[0]]
            sql = _compile_transform(node, pred_alias, state.alias_of)
            alias = f"n_{node.id}"
            state.cte_defs.append(f"{alias} AS ({sql})")
            state.alias_of[node_id] = alias
            state.node_sql[node_id] = sql
            state.cte_prefix_upto[node_id] = "WITH " + ",\n".join(state.cte_defs)
            last_alias = alias

        elif node.kind == "quality":
            if not preds:
                raise CompileError(f"Quality node {node_id} has no upstream input")
            pred_alias = state.alias_of[preds[0]]
            check_sql = _compile_quality(node, pred_alias)
            prefix = "WITH " + ",\n".join(state.cte_defs) + "\n" if state.cte_defs else ""
            state.node_sql[node_id] = prefix + check_sql
            state.alias_of[node_id] = pred_alias  # passthrough, unchanged
            state.cte_prefix_upto[node_id] = state.cte_prefix_upto[preds[0]]

        elif node.kind == "destination":
            if not preds:
                raise CompileError(f"Destination node {node_id} has no upstream input")
            pred_alias = state.alias_of[preds[0]]
            target = _compile_destination_target(node)
            destination_targets[node_id] = target
            final_select = f"SELECT * FROM {pred_alias}"
            prefix = "WITH " + ",\n".join(state.cte_defs) + "\n" if state.cte_defs else ""
            state.destination_select_sql[node_id] = f"{prefix}{final_select}"
            state.node_sql[node_id] = f"CREATE TABLE IF NOT EXISTS {target} AS\n{prefix}{final_select}"
            state.alias_of[node_id] = pred_alias
            state.cte_prefix_upto[node_id] = state.cte_prefix_upto[preds[0]]

        else:
            raise CompileError(f"Unknown node kind: {node.kind}")

    dest_nodes = [n for n in defn.nodes if n.kind == "destination"]
    if dest_nodes:
        full_sql = state.node_sql[dest_nodes[-1].id]
    elif last_alias and state.cte_defs:
        full_sql = "WITH " + ",\n".join(state.cte_defs) + f"\nSELECT * FROM {last_alias}"
    else:
        full_sql = ""

    return CompiledPipeline(
        order=order,
        node_sql=state.node_sql,
        full_sql=full_sql,
        destination_targets=destination_targets,
        alias_of=state.alias_of,
        cte_prefix_upto=state.cte_prefix_upto,
        destination_select_sql=state.destination_select_sql,
    )


def topo_sort(defn: PipelineDefinition) -> list[str]:
    return _topo_sort(defn.nodes, defn.edges)


def predecessors(node_id: str, defn: PipelineDefinition) -> list[str]:
    return _predecessors(node_id, defn.edges)


