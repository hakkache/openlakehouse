import threading
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.lineage import extract_pipeline_lineage
from app.core.pipeline_compiler import CompileError, CompiledPipeline, compile_pipeline
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
    PipelineRead,
    PipelineRunRead,
    PipelineRunStatus,
)

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


def _to_compile_result(compiled: CompiledPipeline) -> CompileResult:
    return CompileResult(
        nodes=[CompiledNode(node_id=nid, sql=sql) for nid, sql in compiled.node_sql.items()],
        full_sql=compiled.full_sql,
    )


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


@router.get("/lineage", response_model=LineageGraph)
def get_lineage(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)) -> LineageGraph:
    """Aggregate table-level lineage graph derived from every saved pipeline definition."""
    pipelines = list(db.scalars(select(Pipeline)))
    node_ids: set[str] = set()
    edges: list[LineageGraphEdge] = []
    for pipeline in pipelines:
        try:
            defn = PipelineDefinition.model_validate(pipeline.definition)
        except Exception:  # noqa: BLE001
            continue
        for edge in extract_pipeline_lineage(str(pipeline.id), pipeline.name, defn):
            node_ids.add(edge.source_fqn)
            node_ids.add(edge.target_fqn)
            edges.append(
                LineageGraphEdge(
                    id=f"{pipeline.id}:{edge.source_fqn}->{edge.target_fqn}",
                    source=edge.source_fqn,
                    target=edge.target_fqn,
                    pipeline_id=edge.pipeline_id,
                    pipeline_name=edge.pipeline_name,
                )
            )
    nodes = [LineageGraphNode(id=nid, label=nid) for nid in sorted(node_ids)]
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
    db.delete(pipeline)
    db.commit()


@router.post("/compile", response_model=CompileResult)
def compile_ad_hoc(payload: PipelineDefinition, user: CurrentUser = Depends(get_current_user)) -> CompileResult:
    try:
        compiled = compile_pipeline(payload)
    except CompileError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _to_compile_result(compiled)


@router.post("/{pipeline_id}/compile", response_model=CompileResult)
def compile_saved(
    pipeline_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> CompileResult:
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    defn = PipelineDefinition.model_validate(pipeline.definition)
    try:
        compiled = compile_pipeline(defn)
    except CompileError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _to_compile_result(compiled)


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
        for node_id in compiled.order:
            node_run = node_runs[node_id]
            node = nodes_by_id[node_id]

            if failed:
                node_run.status = "SKIPPED"
                db.commit()
                continue

            node_run.status = "RUNNING"
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
    cfg = node.config
    t = node.type
    if t == "row_count":
        min_v = cfg.get("min")
        max_v = cfg.get("max")
        if min_v is not None and value < min_v:
            return False, f"Row count {value} is below minimum {min_v}"
        if max_v is not None and value > max_v:
            return False, f"Row count {value} exceeds maximum {max_v}"
        return True, f"Row count {value} within bounds"
    # not_null / unique / range / regex / freshness all report a "violations" count
    if value > 0:
        return False, f"{value} row(s) violated the '{t}' check"
    return True, f"0 violations for '{t}' check"


@router.post("/{pipeline_id}/run", response_model=PipelineRunStatus, status_code=202)
def run_pipeline(
    pipeline_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> PipelineRunStatus:
    pipeline = db.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

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
        nodes=[
            NodeRunStatus(
                node_id=nr.node_id,
                status=nr.status,
                message=nr.message,
                row_count=nr.row_count,
                duration_ms=nr.duration_ms,
            )
            for nr in node_runs
        ],
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
