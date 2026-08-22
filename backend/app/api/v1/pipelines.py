import threading
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.lineage import extract_pipeline_lineage
from app.core.pipeline_compiler import CompileError, CompiledPipeline, compile_pipeline, evaluate_quality
from app.core.pipeline_executor import has_advanced_nodes, preview_advanced_pipeline, requires_elevated_role, run_advanced_pipeline
from app.core.security import CurrentUser, get_current_user
from app.core.trino_client import get_trino_connection
from app.models.pipeline import Pipeline, PipelineNodeRun, PipelineRun
from app.schemas.lineage import LineageGraph, LineageGraphEdge, LineageGraphNode
from app.schemas.quality import QualityCheckResult, QualitySummary
from app.schemas.pipeline import (
    CompiledNode,
    CompileResult,
    NodeRunStatus,
    PipelineCreate,
    PipelineDefinition,
    PipelineNode,
    PipelineRead,
    PipelineRunRead,
    PipelineRunStatus,
)

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


def _to_compile_result(compiled: CompiledPipeline, nodes_by_id: dict[str, PipelineNode] | None = None) -> CompileResult:
    nodes_by_id = nodes_by_id or {}
    return CompileResult(
        nodes=[
            CompiledNode(
                node_id=nid,
                kind=nodes_by_id[nid].kind if nid in nodes_by_id else "",
                type=nodes_by_id[nid].type if nid in nodes_by_id else "",
                sql=sql,
                status="ok",
            )
            for nid, sql in compiled.node_sql.items()
        ],
        full_sql=compiled.full_sql,
        mode="sql",
    )


def _to_preview_result(defn: PipelineDefinition, db: Session) -> CompileResult:
    try:
        previews = preview_advanced_pipeline(defn, db)
    except CompileError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CompileResult(
        nodes=[
            CompiledNode(node_id=p.node_id, kind=p.kind, type=p.type, sql=p.detail, status=p.status, error=p.error)
            for p in previews
        ],
        full_sql="",
        mode="advanced",
    )


def _node_run_statuses(node_runs: list[PipelineNodeRun]) -> list[NodeRunStatus]:
    # sequence is set by every write path now, but tolerate None (e.g. rows from before
    # the 0009 migration backfilled it) by falling back to node_id as a stable tiebreaker.
    ordered = sorted(node_runs, key=lambda nr: (nr.sequence if nr.sequence is not None else 0, nr.node_id))
    return [
        NodeRunStatus(
            node_id=nr.node_id,
            status=nr.status,
            message=nr.message,
            row_count=nr.row_count,
            duration_ms=nr.duration_ms,
            started_at=nr.started_at,
            sequence=nr.sequence,
            iteration_index=nr.iteration_index,
            parent_node_id=nr.parent_node_id,
        )
        for nr in ordered
    ]


@router.post("", response_model=PipelineRead, status_code=201)
def create_pipeline(
    payload: PipelineCreate, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> Pipeline:
    pipeline = Pipeline(
        name=payload.name,
        version=payload.definition.version,
        definition=payload.definition.model_dump(),
        created_by=user.username or user.subject,
    )
    db.add(pipeline)
    db.commit()
    db.refresh(pipeline)
    return pipeline


@router.get("", response_model=list[PipelineRead])
def list_pipelines(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)) -> list[Pipeline]:
    return list(db.scalars(select(Pipeline).order_by(Pipeline.updated_at.desc())))


def _table_layer(fqn: str) -> str:
    # fqn is "iceberg.<schema>.<table>" - schema is the medallion layer for tables
    # written by the pipeline builder (bronze/silver/gold); anything else (e.g. a raw
    # source schema queried directly) is bucketed as "other".
    parts = fqn.split(".")
    schema = parts[1] if len(parts) > 1 else ""
    return schema if schema in ("bronze", "silver", "gold") else "other"


@router.get("/lineage", response_model=LineageGraph)
def get_lineage(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)) -> LineageGraph:
    """Aggregate table-level lineage graph derived from every saved pipeline definition."""
    pipelines = list(db.scalars(select(Pipeline)))
    node_ids: set[str] = set()
    edges: list[LineageGraphEdge] = []
    # (pipeline_id, destination node's internal id) -> table fqn it writes, so the latest
    # PipelineNodeRun for that node can be used as the table's freshness/health overlay.
    dest_lookup: dict[tuple[str, str], str] = {}
    for pipeline in pipelines:
        try:
            defn = PipelineDefinition.model_validate(pipeline.definition)
        except Exception:  # noqa: BLE001
            continue
        for edge in extract_pipeline_lineage(str(pipeline.id), pipeline.name, defn):
            node_ids.add(edge.source_fqn)
            node_ids.add(edge.target_fqn)
            dest_lookup[(edge.pipeline_id, edge.dest_node_id)] = edge.target_fqn
            edges.append(
                LineageGraphEdge(
                    id=f"{pipeline.id}:{edge.source_fqn}->{edge.target_fqn}",
                    source=edge.source_fqn,
                    target=edge.target_fqn,
                    pipeline_id=edge.pipeline_id,
                    pipeline_name=edge.pipeline_name,
                )
            )

    table_health: dict[str, tuple[str, datetime, int | None]] = {}
    if dest_lookup:
        pipeline_ids = {uuid.UUID(pid) for pid, _ in dest_lookup}
        rows = db.execute(
            select(PipelineNodeRun, PipelineRun)
            .join(PipelineRun, PipelineNodeRun.run_id == PipelineRun.id)
            .where(PipelineRun.pipeline_id.in_(pipeline_ids))
            .order_by(PipelineRun.started_at.desc())
        )
        for node_run, run in rows:
            fqn = dest_lookup.get((str(run.pipeline_id), node_run.node_id))
            # Rows are ordered newest-run-first, so the first hit per fqn is the latest.
            if fqn and fqn not in table_health:
                table_health[fqn] = (node_run.status, run.finished_at or run.started_at, node_run.row_count)

    nodes = [
        LineageGraphNode(
            id=nid,
            label=nid,
            layer=_table_layer(nid),
            last_status=table_health[nid][0] if nid in table_health else None,
            last_run_at=table_health[nid][1] if nid in table_health else None,
            last_row_count=table_health[nid][2] if nid in table_health else None,
        )
        for nid in sorted(node_ids)
    ]
    return LineageGraph(nodes=nodes, edges=edges)


@router.get("/quality", response_model=QualitySummary)
def get_quality_summary(
    db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> QualitySummary:
    """Aggregate results of every executed pipeline `quality` node across every run.

    Reuses the real check results already produced by `_run_pipeline` (which executes
    the compiler's generated SQL against live Trino/Iceberg data) rather than
    re-running checks - this endpoint is a read-only rollup/dashboard over that history.
    """
    pipelines = {p.id: p for p in db.scalars(select(Pipeline))}
    quality_node_types: dict[tuple[uuid.UUID, str], str] = {}
    for pipeline in pipelines.values():
        try:
            defn = PipelineDefinition.model_validate(pipeline.definition)
        except Exception:  # noqa: BLE001
            continue
        for node in defn.nodes:
            if node.kind == "quality":
                quality_node_types[(pipeline.id, node.id)] = node.type

    runs = {r.id: r for r in db.scalars(select(PipelineRun))}
    node_runs = list(db.scalars(select(PipelineNodeRun).order_by(PipelineNodeRun.id.desc())))

    history: list[QualityCheckResult] = []
    for nr in node_runs:
        run = runs.get(nr.run_id)
        if run is None:
            continue
        check_type = quality_node_types.get((run.pipeline_id, nr.node_id))
        if check_type is None:
            continue
        pipeline = pipelines.get(run.pipeline_id)
        history.append(
            QualityCheckResult(
                run_id=str(run.id),
                pipeline_id=str(run.pipeline_id),
                pipeline_name=pipeline.name if pipeline else "",
                node_id=nr.node_id,
                check_type=check_type,
                status=nr.status,
                message=nr.message,
                row_count=nr.row_count,
                started_at=run.started_at,
            )
        )

    evaluated = [h for h in history if h.status in ("SUCCESS", "FAILED")]
    passed = sum(1 for h in evaluated if h.status == "SUCCESS")
    failed = sum(1 for h in evaluated if h.status == "FAILED")
    total = len(evaluated)
    score = round((passed / total) * 100, 1) if total else 100.0

    return QualitySummary(
        total_checks=total,
        passed=passed,
        failed=failed,
        warnings=0,
        quality_score=score,
        history=history[:200],
    )


@router.get("/{pipeline_id}", response_model=PipelineRead)
def get_pipeline(
    pipeline_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> Pipeline:
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


@router.put("/{pipeline_id}", response_model=PipelineRead)
def update_pipeline(
    pipeline_id: uuid.UUID,
    payload: PipelineCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> Pipeline:
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    pipeline.name = payload.name
    pipeline.definition = payload.definition.model_dump()
    pipeline.version += 1
    db.commit()
    db.refresh(pipeline)
    return pipeline


@router.delete("/{pipeline_id}", status_code=204)
def delete_pipeline(
    pipeline_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> None:
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    # pipeline_runs/pipeline_node_runs have no ORM cascade configured, so any run
    # history must be deleted first or the FK constraint on pipeline_runs blocks the delete.
    run_ids = [r.id for r in db.execute(select(PipelineRun.id).where(PipelineRun.pipeline_id == pipeline_id)).all()]
    if run_ids:
        db.query(PipelineNodeRun).filter(PipelineNodeRun.run_id.in_(run_ids)).delete(synchronize_session=False)
        db.query(PipelineRun).filter(PipelineRun.id.in_(run_ids)).delete(synchronize_session=False)
        db.flush()
    db.delete(pipeline)
    db.commit()


@router.post("/compile", response_model=CompileResult)
def compile_ad_hoc(
    payload: PipelineDefinition, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> CompileResult:
    if has_advanced_nodes(payload):
        return _to_preview_result(payload, db)
    try:
        compiled = compile_pipeline(payload)
    except CompileError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _to_compile_result(compiled, {n.id: n for n in payload.nodes})


@router.post("/{pipeline_id}/compile", response_model=CompileResult)
def compile_saved(
    pipeline_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> CompileResult:
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    defn = PipelineDefinition.model_validate(pipeline.definition)
    if has_advanced_nodes(defn):
        return _to_preview_result(defn, db)
    try:
        compiled = compile_pipeline(defn)
    except CompileError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _to_compile_result(compiled, {n.id: n for n in defn.nodes})


def _table_exists(cursor, schema: str, table: str) -> bool:
    # schema/table are already validated as [A-Za-z_][A-Za-z0-9_]* by the compiler's
    # _quote_ident, so inline interpolation here is safe from injection.
    cursor.execute(
        f"SELECT COUNT(*) FROM iceberg.information_schema.tables "
        f"WHERE table_schema = '{schema}' AND table_name = '{table}'"
    )
    (count,) = cursor.fetchone()
    return count > 0


def _run_pipeline(run_id: str, pipeline_id: str, definition: dict, user: str) -> None:
    db = SessionLocal()
    try:
        run = db.get(PipelineRun, uuid.UUID(run_id))
        defn = PipelineDefinition.model_validate(definition)
        nodes_by_id = {n.id: n for n in defn.nodes}

        if has_advanced_nodes(defn):
            # Pipeline uses variable/code/control/api_ingestion/sub_pipeline nodes -
            # delegate to the step-by-step engine (see pipeline_executor.py) instead
            # of compiling everything into one SQL statement.
            run_advanced_pipeline(db, run, defn, user)
            return

        try:
            compiled = compile_pipeline(defn)
        except CompileError as exc:
            run.status = "FAILED"
            run.error = str(exc)
            db.commit()
            return

        for node_id in compiled.order:
            db.add(PipelineNodeRun(run_id=uuid.UUID(run_id), node_id=node_id, status="PENDING"))
        db.commit()

        run.status = "RUNNING"
        db.commit()

        conn = get_trino_connection(user=user)
        cursor = conn.cursor()

        node_runs = {
            nr.node_id: nr
            for nr in db.scalars(select(PipelineNodeRun).where(PipelineNodeRun.run_id == uuid.UUID(run_id)))
        }

        failed = False
        for idx, node_id in enumerate(compiled.order):
            node_run = node_runs[node_id]
            node = nodes_by_id[node_id]
            node_run.sequence = idx + 1

            if failed:
                node_run.status = "SKIPPED"
                db.commit()
                continue

            node_run.status = "RUNNING"
            node_run.started_at = datetime.now(timezone.utc)
            db.commit()
            started = time.monotonic()
            try:
                if node.kind in ("source", "transform"):
                    probe_sql = f"{compiled.cte_prefix_upto[node_id]}\nSELECT COUNT(*) AS c FROM {compiled.alias_of[node_id]}"
                    cursor.execute(probe_sql)
                    (row_count,) = cursor.fetchone()
                    node_run.status = "SUCCESS"
                    node_run.row_count = row_count

                elif node.kind == "quality":
                    cursor.execute(compiled.node_sql[node_id])
                    (value,) = cursor.fetchone()
                    passed, message = _evaluate_quality(node, value)
                    node_run.row_count = value
                    node_run.message = message
                    if passed:
                        node_run.status = "SUCCESS"
                    else:
                        node_run.status = "FAILED"
                        failed = True
                        run.error = message

                elif node.kind == "destination":
                    target = compiled.destination_targets[node_id]
                    schema_name, table_name = target.split(".")[1], target.split(".")[2]
                    # Polaris/Iceberg REST catalog requires the namespace to exist before
                    # CREATE TABLE - unlike bronze (created explicitly by Spark jobs),
                    # silver/gold are only ever targeted here, so ensure it up front.
                    cursor.execute(f"CREATE SCHEMA IF NOT EXISTS iceberg.{schema_name}")
                    cursor.fetchall()
                    exists = _table_exists(cursor, schema_name, table_name)
                    select_sql = compiled.destination_select_sql[node_id]
                    if exists:
                        cursor.execute(f"INSERT INTO {target}\n{select_sql}")
                    else:
                        cursor.execute(f"CREATE TABLE {target} AS\n{select_sql}")
                    cursor.fetchall()
                    # Row count written == rows produced by the upstream chain feeding this destination.
                    cursor.execute(
                        f"{compiled.cte_prefix_upto[node_id]}\nSELECT COUNT(*) AS c FROM {compiled.alias_of[node_id]}"
                    )
                    (row_count,) = cursor.fetchone()
                    node_run.status = "SUCCESS"
                    node_run.row_count = row_count
                    node_run.message = f"{'Inserted into' if exists else 'Created'} {target}"


            except Exception as exc:  # noqa: BLE001
                node_run.status = "FAILED"
                node_run.message = str(exc)
                failed = True
                run.error = str(exc)
            finally:
                node_run.duration_ms = int((time.monotonic() - started) * 1000)
                db.commit()

        run.status = "FAILED" if failed else "SUCCESS"
    except Exception as exc:  # noqa: BLE001
        run.status = "FAILED"
        run.error = str(exc)
    finally:
        run.finished_at = datetime.now(timezone.utc)
        db.commit()
        db.close()


def _predecessors_of(node_id: str, defn: PipelineDefinition):
    return [e.source for e in defn.edges if e.target == node_id]


def _evaluate_quality(node, value: int) -> tuple[bool, str]:
    return evaluate_quality(node, value)


@router.post("/{pipeline_id}/run", response_model=PipelineRunStatus, status_code=202)
def run_pipeline(
    pipeline_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> PipelineRunStatus:
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    defn = PipelineDefinition.model_validate(pipeline.definition)
    if requires_elevated_role(defn) and not user.has_role("ADMIN", "DATA_ENGINEER"):
        raise HTTPException(
            status_code=403,
            detail="This pipeline contains a python/pyspark code node - running it requires the ADMIN or DATA_ENGINEER role",
        )

    run = PipelineRun(pipeline_id=pipeline_id, status="QUEUED", executed_by=user.username or user.subject)
    db.add(run)
    db.commit()
    db.refresh(run)

    username = user.username or user.subject
    thread = threading.Thread(
        target=_run_pipeline, args=(str(run.id), str(pipeline_id), pipeline.definition, username), daemon=True
    )
    thread.start()
    return PipelineRunStatus(id=run.id, pipeline_id=pipeline_id, status="QUEUED", nodes=[])


@router.get("/runs/{run_id}", response_model=PipelineRunStatus)
def get_run_status(
    run_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> PipelineRunStatus:
    run = db.get(PipelineRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    node_runs = list(db.scalars(select(PipelineNodeRun).where(PipelineNodeRun.run_id == run_id)))
    return PipelineRunStatus(
        id=run.id,
        pipeline_id=run.pipeline_id,
        status=run.status,
        error=run.error,
        nodes=_node_run_statuses(node_runs),
    )


@router.get("/runs/{run_id}/stream")
def stream_run_status(run_id: uuid.UUID, user: CurrentUser = Depends(get_current_user)) -> StreamingResponse:
    """Server-Sent Events version of get_run_status - pushes a fresh snapshot roughly
    once a second (only when it actually changed) until the run reaches a terminal
    status, replacing the frontend's old 1.5s polling loop with real live updates for
    the Run Log panel. Uses its own short-lived SessionLocal (not the request-scoped
    Depends(get_db) session) since this generator outlives a normal request/response
    cycle; db.expire_all() before each poll forces fresh reads of rows committed by the
    separate run-execution thread/session.
    """

    def generate():
        db = SessionLocal()
        last_payload: str | None = None
        try:
            while True:
                db.expire_all()
                run = db.get(PipelineRun, run_id)
                if not run:
                    yield 'event: error\ndata: {"detail": "Run not found"}\n\n'
                    return
                node_runs = list(db.scalars(select(PipelineNodeRun).where(PipelineNodeRun.run_id == run_id)))
                status = PipelineRunStatus(
                    id=run.id,
                    pipeline_id=run.pipeline_id,
                    status=run.status,
                    error=run.error,
                    nodes=_node_run_statuses(node_runs),
                )
                payload = status.model_dump_json()
                if payload != last_payload:
                    yield f"data: {payload}\n\n"
                    last_payload = payload
                if run.status in ("SUCCESS", "FAILED"):
                    return
                time.sleep(1.0)
        finally:
            db.close()

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )



@router.get("/{pipeline_id}/runs", response_model=list[PipelineRunRead])
def list_runs(
    pipeline_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> list[PipelineRun]:
    return list(
        db.scalars(
            select(PipelineRun).where(PipelineRun.pipeline_id == pipeline_id).order_by(PipelineRun.started_at.desc())
        )
    )
