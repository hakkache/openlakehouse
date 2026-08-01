import threading
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.security import CurrentUser, get_current_user
from app.core.trino_client import get_trino_connection
from app.models.sql import QueryExecution, SavedQuery
from app.schemas.sql import (
    QueryExecutionRead,
    QueryRequest,
    QueryStatus,
    SavedQueryCreate,
    SavedQueryRead,
)

router = APIRouter(prefix="/sql", tags=["sql"])


class _RunningQuery:
    def __init__(self) -> None:
        self.status = "RUNNING"
        self.trino_query_id: str | None = None
        self.columns: list[str] | None = None
        self.rows: list[list] | None = None
        self.row_count: int | None = None
        self.duration_ms: int | None = None
        self.error: str | None = None
        self.cursor = None


_REGISTRY: dict[str, _RunningQuery] = {}
_REGISTRY_LOCK = threading.Lock()


def _persist_execution(query_id: str, sql_text: str, user: str, handle: "_RunningQuery") -> None:
    db = SessionLocal()
    try:
        db.add(
            QueryExecution(
                id=uuid.UUID(query_id),
                trino_query_id=handle.trino_query_id,
                sql_text=sql_text,
                status=handle.status,
                row_count=handle.row_count,
                duration_ms=handle.duration_ms,
                error=handle.error,
                executed_by=user,
            )
        )
        db.commit()
    finally:
        db.close()


def _execute_in_background(query_id: str, sql_text: str, user: str) -> None:
    handle = _REGISTRY[query_id]
    started = time.monotonic()
    try:
        conn = get_trino_connection(user=user)
        cursor = conn.cursor()
        handle.cursor = cursor
        cursor.execute(sql_text)
        handle.trino_query_id = cursor.query_id
        rows = cursor.fetchall()
        handle.columns = [desc[0] for desc in cursor.description] if cursor.description else []
        handle.rows = [list(r) for r in rows]
        handle.row_count = len(rows)
        if handle.status == "RUNNING":
            handle.status = "FINISHED"
    except Exception as exc:  # noqa: BLE001
        if handle.status != "CANCELLED":
            handle.status = "FAILED"
            handle.error = str(exc)
    finally:
        handle.duration_ms = int((time.monotonic() - started) * 1000)
        _persist_execution(query_id, sql_text, user, handle)


@router.post("/queries", response_model=QueryStatus, status_code=202)
def submit_query(payload: QueryRequest, user: CurrentUser = Depends(get_current_user)) -> QueryStatus:
    query_id = str(uuid.uuid4())
    with _REGISTRY_LOCK:
        _REGISTRY[query_id] = _RunningQuery()
    username = user.username or user.subject
    thread = threading.Thread(target=_execute_in_background, args=(query_id, payload.sql, username), daemon=True)
    thread.start()
    return QueryStatus(id=uuid.UUID(query_id), status="RUNNING")


@router.get("/queries/{query_id}", response_model=QueryStatus)
def get_query_status(query_id: uuid.UUID, user: CurrentUser = Depends(get_current_user)) -> QueryStatus:
    handle = _REGISTRY.get(str(query_id))
    if handle is None:
        raise HTTPException(status_code=404, detail="Query not found")
    return QueryStatus(
        id=query_id,
        status=handle.status,
        columns=handle.columns,
        rows=handle.rows,
        row_count=handle.row_count,
        duration_ms=handle.duration_ms,
        error=handle.error,
    )


@router.post("/queries/{query_id}/cancel", status_code=204)
def cancel_query(query_id: uuid.UUID, user: CurrentUser = Depends(get_current_user)) -> None:
    handle = _REGISTRY.get(str(query_id))
    if handle is None:
        raise HTTPException(status_code=404, detail="Query not found")
    if handle.status != "RUNNING":
        return
    handle.status = "CANCELLED"
    handle.error = "Cancelled by user"
    if handle.cursor is not None:
        try:
            handle.cursor.cancel()
        except Exception:  # noqa: BLE001
            pass


@router.get("/history", response_model=list[QueryExecutionRead])
def list_history(
    db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> list[QueryExecution]:
    return list(db.scalars(select(QueryExecution).order_by(QueryExecution.created_at.desc()).limit(50)))


@router.get("/saved", response_model=list[SavedQueryRead])
def list_saved(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)) -> list[SavedQuery]:
    return list(db.scalars(select(SavedQuery).order_by(SavedQuery.created_at.desc())))


@router.post("/saved", response_model=SavedQueryRead, status_code=201)
def create_saved(
    payload: SavedQueryCreate, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> SavedQuery:
    saved = SavedQuery(name=payload.name, sql_text=payload.sql_text, created_by=user.username or user.subject)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@router.delete("/saved/{saved_id}", status_code=204)
def delete_saved(
    saved_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> None:
    saved = db.get(SavedQuery, saved_id)
    if not saved:
        raise HTTPException(status_code=404, detail="Saved query not found")
    db.delete(saved)
    db.commit()
