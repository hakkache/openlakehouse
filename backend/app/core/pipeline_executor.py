"""Step-by-step execution engine for pipelines that use "advanced" node kinds
(variable/code/control/api_ingestion/sub_pipeline) that cannot be expressed as a
single compiled SQL statement (see pipeline_compiler.py's module docstring for why
that engine exists and what it's good at).

Execution model:
- Each `source`/`transform` node materializes its output as a real Trino VIEW under
  a dedicated `iceberg.tmp` schema (reusing pipeline_compiler's per-node SQL
  builders), instead of becoming a CTE in one big statement. Downstream nodes
  (including new advanced kinds) reference that view by its fully-qualified name.
- `quality`/`destination` nodes behave the same as the single-SQL engine (same
  pass/fail + INSERT-or-CREATE semantics), just executed against the temp view
  instead of a CTE alias.
- `variable` nodes set a named entry in a shared `variables` dict, either from a
  literal (with `{{other_var}}` substitution) or from the first cell of a query.
- `code` nodes run arbitrary sql/python/pyspark, with `variables` bound so they can
  read/write pipeline state (python/pyspark get a live reference to the dict itself;
  sql nodes can store their first result cell into a variable via
  config.result_variable).
- `api_ingestion` nodes make a real HTTP call (httpx) and store the parsed
  JSON response into a variable.
- `control` nodes: `if` evaluates a boolean expression against `variables` and skips
  the node ids configured under `config.true_skip_nodes` (when the condition is
  true) or `config.false_skip_nodes` (when false); `for_each` iterates a variable
  (must be a list) and re-runs a configured list of "body" node ids per item
  (config.body_node_ids), which are therefore excluded from the pipeline's normal
  top-level execution order.
- `sub_pipeline` nodes look up another saved Pipeline and execute it inline
  (same run, same Trino session), optionally sharing the variables dict
  (config.pass_variables, default true). A call-stack guard prevents infinite
  recursion from a pipeline (in)directly calling itself.

Known limitations (documented rather than silently broken): no per-iteration
parallelism (for_each is sequential), `if`/`for_each` require the UI's raw-JSON
config to explicitly list the node ids they affect (not inferred from graph
shape), and python/pyspark code nodes run with the same trust level as the
existing Data Explorer "PySpark Code" mode (ADMIN/DATA_ENGINEER only, enforced by
the caller via `requires_elevated_role`).
"""

import ast
import contextlib
import io
import re
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.core import dbt_client
from app.core.pipeline_compiler import (
    CompileError,
    compile_destination_target,
    compile_quality_sql,
    compile_source_sql,
    compile_transform_sql,
    evaluate_quality,
    predecessors,
    topo_sort,
)
from app.core.spark_code_runner import run_code as run_pyspark_code
from app.core.trino_client import get_trino_connection
from app.models.pipeline import PipelineNodeRun
from app.schemas.pipeline import PipelineDefinition, PipelineNode

ADVANCED_KINDS = {"variable", "code", "control", "api_ingestion", "sub_pipeline", "dbt"}
_ELEVATED_CODE_TYPES = {"python", "pyspark"}
_TMP_SCHEMA = "tmp"
_TEMPLATE_RE = re.compile(r"\{\{\s*([\w.]+)\s*\}\}")


class ExecutionError(RuntimeError):
    pass


def has_advanced_nodes(defn: PipelineDefinition) -> bool:
    return any(n.kind in ADVANCED_KINDS for n in defn.nodes)


def requires_elevated_role(defn: PipelineDefinition) -> bool:
    return any(n.kind == "code" and n.type in _ELEVATED_CODE_TYPES for n in defn.nodes)


@dataclass
class NodePreview:
    node_id: str
    kind: str
    type: str
    status: str  # "ok" | "error"
    detail: str = ""
    error: str | None = None


def preview_advanced_pipeline(defn: PipelineDefinition, db: Session | None = None) -> list[NodePreview]:
    """Side-effect-free, per-node "compile preview" for pipelines that mix in advanced
    node kinds and therefore have no single compiled SQL statement (see module
    docstring). Never executes user code, mutates data, or requires the pipeline to
    actually be runnable end-to-end - it only renders templates with an empty
    `variables` dict (so `{{var}}` placeholders show as-is), checks required config
    keys are present, and does cheap syntax validation (ast.parse for python/pyspark,
    compile(..., "eval") for `if` conditions, Trino EXPLAIN for sql code nodes). Errors
    on one node don't stop the others from being checked, so - like Azure Data
    Factory/Talend's "Validate" - the user sees every problem in one pass.
    """
    order = topo_sort(defn)  # raises CompileError on a cycle/bad edge ref - caller shows one clear error
    nodes_by_id = {n.id: n for n in defn.nodes}
    alias_of: dict[str, str] = {}
    results: list[NodePreview] = []
    trino_conn = None

    def explain_sql(query: str) -> str:
        nonlocal trino_conn
        if trino_conn is None:
            trino_conn = get_trino_connection()
        cursor = trino_conn.cursor()
        cursor.execute(f"EXPLAIN {query}")
        cursor.fetchall()
        return "Trino EXPLAIN: OK"

    try:
        for node_id in order:
            node = nodes_by_id[node_id]
            preds = predecessors(node_id, defn)
            try:
                if node.kind == "source":
                    sql = compile_source_sql(node)
                    alias_of[node.id] = _view_name("preview", node.id)
                    results.append(NodePreview(node.id, node.kind, node.type, "ok", sql))
                elif node.kind == "transform":
                    if not preds or preds[0] not in alias_of:
                        raise CompileError(f"Transform node {node.id} has no available upstream input")
                    sql = compile_transform_sql(node, alias_of[preds[0]], alias_of)
                    alias_of[node.id] = _view_name("preview", node.id)
                    results.append(NodePreview(node.id, node.kind, node.type, "ok", sql))
                elif node.kind == "quality":
                    if not preds or preds[0] not in alias_of:
                        raise CompileError(f"Quality node {node.id} has no available upstream input")
                    sql = compile_quality_sql(node, alias_of[preds[0]])
                    alias_of[node.id] = alias_of[preds[0]]
                    results.append(NodePreview(node.id, node.kind, node.type, "ok", sql))
                elif node.kind == "destination":
                    if not preds or preds[0] not in alias_of:
                        raise CompileError(f"Destination node {node.id} has no available upstream input")
                    target = compile_destination_target(node)
                    detail = f"INSERT INTO {target} (or CREATE TABLE if it doesn't exist yet)\nSELECT * FROM {alias_of[preds[0]]}"
                    alias_of[node.id] = target
                    results.append(NodePreview(node.id, node.kind, node.type, "ok", detail))
                elif node.kind == "variable":
                    cfg = node.config
                    name = cfg.get("name")
                    if not name:
                        raise ExecutionError(f"variable node {node.id} requires config.name")
                    if node.type == "from_query":
                        query = _render_template(cfg.get("query", ""), {})
                        if not query:
                            raise ExecutionError(f"variable node {node.id} (from_query) requires config.query")
                        detail = f"SET {name} = first result cell of:\n{query}"
                    else:
                        value = _render_template(cfg.get("value"), {})
                        detail = f"SET {name} = {value!r}"
                    results.append(NodePreview(node.id, node.kind, node.type, "ok", detail))
                elif node.kind == "api_ingestion":
                    cfg = node.config
                    url = _render_template(cfg.get("url", ""), {})
                    if not url:
                        raise ExecutionError(f"api_ingestion node {node.id} requires config.url")
                    method = "POST" if node.type == "rest_post" else "GET"
                    result_variable = cfg.get("result_variable") or node.id
                    detail = f"{method} {url}\n-> stores response in variable '{result_variable}'"
                    results.append(NodePreview(node.id, node.kind, node.type, "ok", detail))
                elif node.kind == "code":
                    cfg = node.config
                    if node.type == "sql":
                        query = _render_template(cfg.get("query", ""), {})
                        if not query:
                            raise ExecutionError(f"sql code node {node.id} requires config.query")
                        detail = query
                        try:
                            detail = f"{query}\n\n-- {explain_sql(query)}"
                        except Exception as exc:  # noqa: BLE001 - surfaced as this node's error below
                            raise ExecutionError(f"Trino EXPLAIN failed: {exc}") from exc
                        results.append(NodePreview(node.id, node.kind, node.type, "ok", detail))
                    elif node.type in ("python", "pyspark"):
                        code = _render_template(cfg.get("code", ""), {})
                        if not code:
                            raise ExecutionError(f"{node.type} code node {node.id} requires config.code")
                        ast.parse(code)
                        results.append(
                            NodePreview(node.id, node.kind, node.type, "ok", f"Syntax OK ({len(code.splitlines())} line(s))")
                        )
                    else:
                        raise ExecutionError(f"Unsupported code node type '{node.type}'")
                elif node.kind == "control":
                    if node.type == "if":
                        condition = node.config.get("condition")
                        if not condition:
                            raise ExecutionError(f"if node {node.id} requires config.condition")
                        compile(condition, f"<pipeline-node-{node.id}>", "eval")
                        results.append(NodePreview(node.id, node.kind, node.type, "ok", f"if {condition}"))
                    elif node.type == "for_each":
                        items_variable = node.config.get("items_variable")
                        item_variable = node.config.get("item_variable", "item")
                        body_node_ids = node.config.get("body_node_ids") or []
                        if not items_variable or not body_node_ids:
                            raise ExecutionError(
                                f"for_each node {node.id} requires config.items_variable and a non-empty loop body"
                            )
                        detail = f"for {item_variable} in {items_variable}: {len(body_node_ids)} node(s) per iteration"
                        results.append(NodePreview(node.id, node.kind, node.type, "ok", detail))
                    else:
                        raise ExecutionError(f"Unsupported control type '{node.type}'")
                elif node.kind == "sub_pipeline":
                    pipeline_id = node.config.get("pipeline_id")
                    if not pipeline_id:
                        raise ExecutionError(f"sub_pipeline node {node.id} requires config.pipeline_id")
                    detail = f"Calls pipeline {pipeline_id}"
                    if db is not None:
                        from app.models.pipeline import Pipeline  # local import: avoid a module-level cycle risk

                        target_pipeline = db.get(Pipeline, uuid.UUID(pipeline_id))
                        if target_pipeline is None:
                            raise ExecutionError(f"sub_pipeline node {node.id}: pipeline {pipeline_id} not found")
                        detail = f"Calls pipeline '{target_pipeline.name}' ({pipeline_id})"
                    results.append(NodePreview(node.id, node.kind, node.type, "ok", detail))
                elif node.kind == "dbt":
                    cfg = node.config
                    select = _render_template(cfg.get("select", ""), {})
                    if not select:
                        raise ExecutionError(f"dbt node {node.id} requires config.select")
                    flags = " --full-refresh" if cfg.get("full_refresh") else ""
                    detail = f"dbt {node.type} --select {select}{flags}"
                    results.append(NodePreview(node.id, node.kind, node.type, "ok", detail))
                else:
                    raise ExecutionError(f"Node kind '{node.kind}' is not recognized")
            except (CompileError, ExecutionError, SyntaxError, ValueError) as exc:
                results.append(NodePreview(node.id, node.kind, node.type, "error", "", str(exc)))
    finally:
        if trino_conn is not None:
            with contextlib.suppress(Exception):
                trino_conn.close()

    return results


def _render_template(value, variables: dict):
    if not isinstance(value, str):
        return value

    def repl(m: re.Match) -> str:
        return str(variables.get(m.group(1).strip(), m.group(0)))

    return _TEMPLATE_RE.sub(repl, value)


def _safe_id(node_id: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]", "_", node_id)


@dataclass
class _Context:
    cursor: object
    db: Session
    run_id: str
    user: str
    call_stack: set = field(default_factory=set)
    variables: dict = field(default_factory=dict)
    # Shared (by reference, even across sub_pipeline's own _Context) monotonically
    # increasing counter so the Run Log panel can sort node runs chronologically even
    # when several share the same started_at timestamp. Mutable single-element list
    # so sub_ctx can point at the SAME counter as its parent (a plain int field would
    # be copied by value into the new _Context and restart at 0).
    sequence_counter: list[int] = field(default_factory=lambda: [0])
    # Set while executing a for_each's body_node_ids so node runs record which
    # iteration/loop node they belong to (see _run_for_each). Not propagated into a
    # sub_pipeline call's own _Context - that's a logically separate pipeline run.
    current_iteration_index: int | None = None
    current_parent_node_id: str | None = None


def _next_sequence(ctx: _Context) -> int:
    ctx.sequence_counter[0] += 1
    return ctx.sequence_counter[0]


def _record_node_run(
    ctx: _Context,
    display_id: str,
    status: str,
    message: str | None = None,
    row_count: int | None = None,
    duration_ms: int | None = None,
) -> None:
    ctx.db.add(
        PipelineNodeRun(
            run_id=uuid.UUID(ctx.run_id),
            node_id=display_id,
            status=status,
            message=message,
            row_count=row_count,
            duration_ms=duration_ms,
            started_at=datetime.now(timezone.utc),
            sequence=_next_sequence(ctx),
            iteration_index=ctx.current_iteration_index,
            parent_node_id=ctx.current_parent_node_id,
        )
    )
    ctx.db.commit()


def _table_exists(cursor, schema: str, table: str) -> bool:
    cursor.execute(
        f"SELECT COUNT(*) FROM iceberg.information_schema.tables "
        f"WHERE table_schema = '{schema}' AND table_name = '{table}'"
    )
    (count,) = cursor.fetchone()
    return count > 0


def _view_name(view_scope: str, node_id: str) -> str:
    return f"iceberg.{_TMP_SCHEMA}.n_{view_scope}_{_safe_id(node_id)}"


def _run_simple_node(
    node: PipelineNode, defn: PipelineDefinition, ctx: _Context, alias_of: dict[str, str], view_scope: str
) -> tuple[str, str | None, int | None]:
    """Execute a single non-control/non-sub_pipeline node. Returns (status, message, row_count)."""
    preds = [e.source for e in defn.edges if e.target == node.id]

    if node.kind == "source":
        sql = compile_source_sql(node)
        view = _view_name(view_scope, node.id)
        ctx.cursor.execute(f"CREATE OR REPLACE VIEW {view} AS {sql}")
        ctx.cursor.fetchall()
        alias_of[node.id] = view
        ctx.cursor.execute(f"SELECT COUNT(*) FROM {view}")
        (row_count,) = ctx.cursor.fetchone()
        return "SUCCESS", None, row_count

    if node.kind == "transform":
        if not preds or preds[0] not in alias_of:
            raise ExecutionError(f"Transform node {node.id} has no available upstream input")
        sql = compile_transform_sql(node, alias_of[preds[0]], alias_of)
        view = _view_name(view_scope, node.id)
        ctx.cursor.execute(f"CREATE OR REPLACE VIEW {view} AS {sql}")
        ctx.cursor.fetchall()
        alias_of[node.id] = view
        ctx.cursor.execute(f"SELECT COUNT(*) FROM {view}")
        (row_count,) = ctx.cursor.fetchone()
        return "SUCCESS", None, row_count

    if node.kind == "quality":
        if not preds or preds[0] not in alias_of:
            raise ExecutionError(f"Quality node {node.id} has no available upstream input")
        sql = compile_quality_sql(node, alias_of[preds[0]])
        ctx.cursor.execute(sql)
        (value,) = ctx.cursor.fetchone()
        passed, message = evaluate_quality(node, value)
        alias_of[node.id] = alias_of[preds[0]]
        if not passed:
            raise ExecutionError(message)
        return "SUCCESS", message, value

    if node.kind == "destination":
        if not preds or preds[0] not in alias_of:
            raise ExecutionError(f"Destination node {node.id} has no available upstream input")
        pred_alias = alias_of[preds[0]]
        target = compile_destination_target(node)
        schema_name, table_name = target.split(".")[1], target.split(".")[2]
        ctx.cursor.execute(f"CREATE SCHEMA IF NOT EXISTS iceberg.{schema_name}")
        ctx.cursor.fetchall()
        exists = _table_exists(ctx.cursor, schema_name, table_name)
        select_sql = f"SELECT * FROM {pred_alias}"
        if exists:
            ctx.cursor.execute(f"INSERT INTO {target}\n{select_sql}")
        else:
            ctx.cursor.execute(f"CREATE TABLE {target} AS\n{select_sql}")
        ctx.cursor.fetchall()
        ctx.cursor.execute(f"SELECT COUNT(*) FROM {pred_alias}")
        (row_count,) = ctx.cursor.fetchone()
        alias_of[node.id] = target
        return "SUCCESS", f"{'Inserted into' if exists else 'Created'} {target}", row_count

    if node.kind == "variable":
        cfg = node.config
        name = cfg.get("name")
        if not name:
            raise ExecutionError(f"variable node {node.id} requires config.name")
        if node.type == "from_query":
            query = _render_template(cfg.get("query", ""), ctx.variables)
            if not query:
                raise ExecutionError(f"variable node {node.id} (from_query) requires config.query")
            ctx.cursor.execute(query)
            row = ctx.cursor.fetchone()
            value = row[0] if row else None
        else:
            value = _render_template(cfg.get("value"), ctx.variables)
        ctx.variables[name] = value
        return "SUCCESS", f"{name} = {value!r}", None

    if node.kind == "api_ingestion":
        cfg = node.config
        url = _render_template(cfg.get("url", ""), ctx.variables)
        if not url:
            raise ExecutionError(f"api_ingestion node {node.id} requires config.url")
        method = "POST" if node.type == "rest_post" else "GET"
        headers = cfg.get("headers") or {}
        json_body = cfg.get("json_body")
        result_variable = cfg.get("result_variable") or node.id
        with httpx.Client(timeout=30.0) as client:
            response = client.request(method, url, headers=headers, json=json_body)
            response.raise_for_status()
            try:
                data = response.json()
            except ValueError:
                data = response.text
        ctx.variables[result_variable] = data
        count = len(data) if isinstance(data, list) else None
        return "SUCCESS", f"Stored response in variable '{result_variable}'", count

    if node.kind == "code":
        cfg = node.config
        if node.type == "sql":
            query = _render_template(cfg.get("query", ""), ctx.variables)
            if not query:
                raise ExecutionError(f"sql code node {node.id} requires config.query")
            ctx.cursor.execute(query)
            row_count = None
            try:
                rows = ctx.cursor.fetchall()
                row_count = len(rows)
                result_variable = cfg.get("result_variable")
                if result_variable and rows:
                    ctx.variables[result_variable] = rows[0][0] if len(rows[0]) == 1 else list(rows[0])
            except Exception:  # noqa: BLE001 - statement may not return rows (e.g. DDL)
                pass
            return "SUCCESS", "Query executed", row_count

        if node.type == "python":
            code = _render_template(cfg.get("code", ""), ctx.variables)
            if not code:
                raise ExecutionError(f"python code node {node.id} requires config.code")
            buffer = io.StringIO()
            namespace: dict[str, object] = {"variables": ctx.variables}
            with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(buffer):
                exec(compile(code, f"<pipeline-node-{node.id}>", "exec"), namespace)  # noqa: S102
            return "SUCCESS", (buffer.getvalue()[:2000] or "(no output)"), None

        if node.type == "pyspark":
            code = _render_template(cfg.get("code", ""), ctx.variables)
            if not code:
                raise ExecutionError(f"pyspark code node {node.id} requires config.code")
            output = run_pyspark_code(
                code, job_group=f"pipeline_{ctx.run_id}_{node.id}", extra_globals={"variables": ctx.variables}
            )
            return "SUCCESS", (output[:2000] or "(no output)"), None

        raise ExecutionError(f"Unsupported code node type '{node.type}'")

    if node.kind == "dbt":
        cfg = node.config
        select = _render_template(cfg.get("select", ""), ctx.variables)
        if not select:
            raise ExecutionError(f"dbt node {node.id} requires config.select")
        result = dbt_client.run(node.type, select, bool(cfg.get("full_refresh")))
        if not result["success"]:
            raise ExecutionError(
                f"dbt {node.type} --select {select} failed (exit {result['return_code']}):\n{result['stderr'][-1500:]}"
            )
        return "SUCCESS", (result["stdout"][-2000:] or f"dbt {node.type} completed"), None

    raise ExecutionError(f"Node kind '{node.kind}' is not handled by _run_simple_node")


def _run_if(node: PipelineNode, ctx: _Context) -> tuple[set, str]:
    condition = node.config.get("condition")
    if not condition:
        raise ExecutionError(f"if node {node.id} requires config.condition")
    try:
        result = bool(eval(condition, {"__builtins__": {}}, dict(ctx.variables)))  # noqa: S307
    except Exception as exc:  # noqa: BLE001
        raise ExecutionError(f"Failed to evaluate condition: {exc}") from exc
    # "true_skip_nodes"/"false_skip_nodes" name the branch to skip when the condition
    # evaluates to that value (matches the builder UI's field labels).
    skip_ids = node.config.get("true_skip_nodes" if result else "false_skip_nodes") or []
    return set(skip_ids), f"Condition evaluated to {result}"


def _run_for_each(
    node: PipelineNode,
    defn: PipelineDefinition,
    nodes_by_id: dict[str, PipelineNode],
    ctx: _Context,
    alias_of: dict[str, str],
    view_scope: str,
) -> tuple[bool, str]:
    items_variable = node.config.get("items_variable")
    item_variable = node.config.get("item_variable", "item")
    body_node_ids: list[str] = node.config.get("body_node_ids") or []
    if not items_variable or not body_node_ids:
        raise ExecutionError(f"for_each node {node.id} requires config.items_variable and config.body_node_ids")
    items = ctx.variables.get(items_variable)
    if not isinstance(items, list):
        raise ExecutionError(f"for_each node {node.id}: variable '{items_variable}' is not a list")

    any_failed = False
    prev_iteration_index, prev_parent_node_id = ctx.current_iteration_index, ctx.current_parent_node_id
    try:
        for i, item in enumerate(items):
            ctx.variables[item_variable] = item
            ctx.current_iteration_index = i
            ctx.current_parent_node_id = node.id
            failed = _run_node_sequence(
                body_node_ids, defn, nodes_by_id, ctx, alias_of, view_scope=f"{view_scope}{i}", suffix=f"[{i}]"
            )
            if failed:
                any_failed = True
                break
    finally:
        ctx.current_iteration_index, ctx.current_parent_node_id = prev_iteration_index, prev_parent_node_id
    return (not any_failed), f"Iterated {len(items)} item(s) over '{items_variable}'"


def _run_sub_pipeline(node: PipelineNode, ctx: _Context) -> tuple[bool, str]:
    from app.models.pipeline import Pipeline  # local import: avoid a module-level cycle risk

    pipeline_id = node.config.get("pipeline_id")
    if not pipeline_id:
        raise ExecutionError(f"sub_pipeline node {node.id} requires config.pipeline_id")
    if pipeline_id in ctx.call_stack:
        raise ExecutionError(f"sub_pipeline node {node.id}: cyclic call detected for pipeline {pipeline_id}")
    pipeline = ctx.db.get(Pipeline, uuid.UUID(pipeline_id))
    if pipeline is None:
        raise ExecutionError(f"sub_pipeline node {node.id}: pipeline {pipeline_id} not found")
    try:
        sub_defn = PipelineDefinition.model_validate(pipeline.definition)
    except Exception as exc:  # noqa: BLE001
        raise ExecutionError(f"sub_pipeline node {node.id}: invalid sub-pipeline definition: {exc}") from exc

    pass_variables = node.config.get("pass_variables", True)
    sub_ctx = _Context(
        cursor=ctx.cursor,
        db=ctx.db,
        run_id=ctx.run_id,
        user=ctx.user,
        call_stack=ctx.call_stack | {pipeline_id},
        variables=ctx.variables if pass_variables else {},
        sequence_counter=ctx.sequence_counter,
    )
    failed = execute_pipeline_definition(sub_defn, sub_ctx, view_scope=f"sp{uuid.uuid4().hex[:8]}")
    if pass_variables:
        ctx.variables.update(sub_ctx.variables)
    return (not failed), f"Sub-pipeline '{pipeline.name}' {'FAILED' if failed else 'SUCCEEDED'}"


def _run_node_sequence(
    node_ids: list[str],
    defn: PipelineDefinition,
    nodes_by_id: dict[str, PipelineNode],
    ctx: _Context,
    alias_of: dict[str, str],
    view_scope: str,
    suffix: str = "",
) -> bool:
    """Execute node_ids in order, returns True if any of them failed (remaining
    siblings in this same sequence are then marked SKIPPED, matching the
    single-SQL engine's fail-fast semantics)."""
    failed = False
    skip_ids: set = set()
    for node_id in node_ids:
        node = nodes_by_id[node_id]
        display_id = f"{node_id}{suffix}"
        if failed or node_id in skip_ids:
            _record_node_run(ctx, display_id, "SKIPPED")
            continue

        started = time.monotonic()
        try:
            if node.kind == "control" and node.type == "if":
                new_skips, message = _run_if(node, ctx)
                skip_ids.update(new_skips)
                _record_node_run(ctx, display_id, "SUCCESS", message=message, duration_ms=_elapsed(started))
                continue

            if node.kind == "control" and node.type == "for_each":
                ok, message = _run_for_each(node, defn, nodes_by_id, ctx, alias_of, view_scope)
                _record_node_run(
                    ctx, display_id, "SUCCESS" if ok else "FAILED", message=message, duration_ms=_elapsed(started)
                )
                failed = failed or not ok
                continue

            if node.kind == "sub_pipeline":
                ok, message = _run_sub_pipeline(node, ctx)
                _record_node_run(
                    ctx, display_id, "SUCCESS" if ok else "FAILED", message=message, duration_ms=_elapsed(started)
                )
                failed = failed or not ok
                continue

            status, message, row_count = _run_simple_node(node, defn, ctx, alias_of, view_scope)
            _record_node_run(ctx, display_id, status, message=message, row_count=row_count, duration_ms=_elapsed(started))
        except ExecutionError as exc:
            _record_node_run(ctx, display_id, "FAILED", message=str(exc), duration_ms=_elapsed(started))
            failed = True
        except Exception as exc:  # noqa: BLE001
            _record_node_run(ctx, display_id, "FAILED", message=str(exc), duration_ms=_elapsed(started))
            failed = True
    return failed


def _elapsed(started: float) -> int:
    return int((time.monotonic() - started) * 1000)


def execute_pipeline_definition(defn: PipelineDefinition, ctx: _Context, view_scope: str) -> bool:
    """Execute an entire pipeline definition's top-level node sequence (i.e. every
    node except ones only reachable as a for_each's loop body). Returns True if
    the run failed."""
    nodes_by_id = {n.id: n for n in defn.nodes}
    body_node_ids: set = set()
    for n in defn.nodes:
        if n.kind == "control" and n.type == "for_each":
            body_node_ids.update(n.config.get("body_node_ids") or [])
    try:
        order = [nid for nid in topo_sort(defn) if nid not in body_node_ids]
    except CompileError as exc:
        raise ExecutionError(str(exc)) from exc
    return _run_node_sequence(order, defn, nodes_by_id, ctx, alias_of={}, view_scope=view_scope)


def run_advanced_pipeline(db: Session, run, defn: PipelineDefinition, user: str) -> None:
    """Entry point mirroring app/api/v1/pipelines.py's `_run_pipeline`, for
    pipelines that contain at least one advanced node kind. `run` is the
    already-persisted PipelineRun row (status QUEUED); this function updates it
    in place (RUNNING -> SUCCESS/FAILED) and creates one PipelineNodeRun per
    executed step, same as the single-SQL engine."""
    from app.core.trino_client import get_trino_connection

    run.status = "RUNNING"
    db.commit()

    conn = get_trino_connection(user=user)
    cursor = conn.cursor()
    cursor.execute(f"CREATE SCHEMA IF NOT EXISTS iceberg.{_TMP_SCHEMA}")
    cursor.fetchall()

    ctx = _Context(cursor=cursor, db=db, run_id=str(run.id), user=user, call_stack={str(run.pipeline_id)})
    try:
        failed = execute_pipeline_definition(defn, ctx, view_scope=str(run.id).replace("-", "")[:8])
        run.status = "FAILED" if failed else "SUCCESS"
    except Exception as exc:  # noqa: BLE001
        run.status = "FAILED"
        run.error = str(exc)
