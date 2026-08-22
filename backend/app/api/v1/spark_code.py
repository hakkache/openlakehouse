import threading
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import SessionLocal, get_db
from app.core.security import CurrentUser, require_roles
from app.core.spark_code_runner import cancel_job_group, run_code, session_status, stop_session
from app.models.sql import SparkCodeExecution
from app.schemas.spark_code import (
    SparkCodeExecutionRead,
    SparkCodeRequest,
    SparkCodeSessionStatus,
    SparkCodeStatus,
)

router = APIRouter(prefix="/spark-code", tags=["spark-code"])

# Arbitrary code execution is more powerful than SQL, so it's restricted to
# roles that already manage pipelines/connections/git, not every SQL user.
CAN_RUN_SPARK_CODE = require_roles("ADMIN", "DATA_ENGINEER")


class _RunningJob:
    def __init__(self) -> None:
        self.status = "RUNNING"
        self.output: str | None = None
        self.error: str | None = None
        self.duration_ms: int | None = None


_REGISTRY: dict[str, _RunningJob] = {}
_REGISTRY_LOCK = threading.Lock()


def _persist(job_id: str, code_text: str, user: str, handle: "_RunningJob") -> None:
    db = SessionLocal()
    try:
        db.add(
            SparkCodeExecution(
                id=uuid.UUID(job_id),
                code_text=code_text,
                status=handle.status,
                output=handle.output,
                error=handle.error,
                duration_ms=handle.duration_ms,
                executed_by=user,
            )
        )
        db.commit()
    finally:
        db.close()


def _run_in_background(job_id: str, code: str, user: str) -> None:
    handle = _REGISTRY[job_id]
    started = time.monotonic()
    try:
        handle.output = run_code(code, job_group=job_id)
        if handle.status == "RUNNING":
            handle.status = "FINISHED"
    except Exception as exc:  # noqa: BLE001
        if handle.status != "CANCELLED":
            handle.status = "FAILED"
            handle.error = str(exc)
    finally:
        handle.duration_ms = int((time.monotonic() - started) * 1000)
        _persist(job_id, code, user, handle)


@router.post("/jobs", response_model=SparkCodeStatus, status_code=202)
def submit_code(payload: SparkCodeRequest, user: CurrentUser = Depends(CAN_RUN_SPARK_CODE)) -> SparkCodeStatus:
    job_id = str(uuid.uuid4())
    with _REGISTRY_LOCK:
        _REGISTRY[job_id] = _RunningJob()
    username = user.username or user.subject
    thread = threading.Thread(target=_run_in_background, args=(job_id, payload.code, username), daemon=True)
    thread.start()
    return SparkCodeStatus(id=uuid.UUID(job_id), status="RUNNING")


@router.get("/jobs/{job_id}", response_model=SparkCodeStatus)
def get_job_status(job_id: uuid.UUID, user: CurrentUser = Depends(CAN_RUN_SPARK_CODE)) -> SparkCodeStatus:
    handle = _REGISTRY.get(str(job_id))
    if handle is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return SparkCodeStatus(
        id=job_id,
        status=handle.status,
        output=handle.output,
        error=handle.error,
        duration_ms=handle.duration_ms,
    )


@router.post("/jobs/{job_id}/cancel", status_code=204)
def cancel_job(job_id: uuid.UUID, user: CurrentUser = Depends(CAN_RUN_SPARK_CODE)) -> None:
    handle = _REGISTRY.get(str(job_id))
    if handle is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if handle.status != "RUNNING":
        return
    handle.status = "CANCELLED"
    handle.error = "Cancelled by user"
    cancel_job_group(job_id)


@router.get("/history", response_model=list[SparkCodeExecutionRead])
def list_history(
    db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_RUN_SPARK_CODE)
) -> list[SparkCodeExecution]:
    return list(db.scalars(select(SparkCodeExecution).order_by(SparkCodeExecution.created_at.desc()).limit(50)))


@router.get("/session/status", response_model=SparkCodeSessionStatus)
def get_session_status(user: CurrentUser = Depends(CAN_RUN_SPARK_CODE)) -> SparkCodeSessionStatus:
    return SparkCodeSessionStatus(**session_status())


@router.post("/session/stop", status_code=204)
def stop_spark_session(
    request: Request, db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_RUN_SPARK_CODE)
) -> None:
    was_running = stop_session()
    record_audit(
        db,
        action="SPARK_CODE_SESSION_STOPPED",
        resource="spark_code_session",
        resource_id="shared",
        status="SUCCESS" if was_running else "NOOP",
        request=request,
        user_id=user.subject,
    )
