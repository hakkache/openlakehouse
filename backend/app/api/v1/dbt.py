import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import dbt_client
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.dbt_run import DbtRun
from app.schemas.dbt import (
    DbtFileContent,
    DbtFileCreateRequest,
    DbtFileNode,
    DbtModelInfo,
    DbtRunDetail,
    DbtRunRead,
    DbtRunRequest,
)

router = APIRouter(prefix="/dbt", tags=["dbt"])


@router.get("/status")
def get_status() -> dict:
    return {"available": dbt_client.is_available()}


@router.get("/models", response_model=list[DbtModelInfo])
def get_models(user: CurrentUser = Depends(get_current_user)) -> list[DbtModelInfo]:
    raw = dbt_client.list_models()
    return [
        DbtModelInfo(
            name=m.get("name", ""),
            resource_type=m.get("resource_type", "model"),
            description=m.get("description", "") or "",
            original_file_path=m.get("original_file_path"),
            schema_name=m.get("schema"),
        )
        for m in raw
    ]


@router.get("/runs", response_model=list[DbtRunRead])
def list_runs(db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)) -> list[DbtRun]:
    return list(db.scalars(select(DbtRun).order_by(DbtRun.started_at.desc()).limit(50)))


@router.get("/runs/{run_id}", response_model=DbtRunDetail)
def get_run(run_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)) -> DbtRun:
    run = db.get(DbtRun, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="dbt run not found")
    return run


@router.post("/run", response_model=DbtRunDetail)
def trigger_run(
    body: DbtRunRequest, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> DbtRun:
    """Runs dbt synchronously (the dbt-runner call itself blocks until dbt exits) and
    persists the full stdout/stderr so the dbt page can show a real run history/log,
    the same way a Pipeline Builder `dbt` node's result is recorded on its node run."""
    started_at = datetime.now(timezone.utc)
    try:
        result = dbt_client.run(body.command, body.select, body.full_refresh)
    except Exception as exc:  # noqa: BLE001 - surfaced as a failed run row below
        run = DbtRun(
            command=body.command,
            select=body.select,
            full_refresh=body.full_refresh,
            status="FAILED",
            return_code=-1,
            stdout="",
            stderr=f"Could not reach the dbt runner: {exc}",
            triggered_by=user.username,
            started_at=started_at,
            finished_at=datetime.now(timezone.utc),
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    run = DbtRun(
        command=body.command,
        select=body.select,
        full_refresh=body.full_refresh,
        status="SUCCESS" if result["success"] else "FAILED",
        return_code=result["return_code"],
        stdout=result["stdout"],
        stderr=result["stderr"],
        triggered_by=user.username,
        started_at=started_at,
        finished_at=datetime.now(timezone.utc),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


@router.get("/files", response_model=list[DbtFileNode])
def list_files(user: CurrentUser = Depends(get_current_user)) -> list[dict]:
    return dbt_client.list_files()


@router.get("/files/content", response_model=DbtFileContent)
def get_file_content(path: str, user: CurrentUser = Depends(get_current_user)) -> dict:
    try:
        return dbt_client.get_file(path)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.json().get("detail", str(exc)))
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach the dbt runner: {exc}")


@router.post("/files", response_model=DbtFileContent, status_code=201)
def create_file(body: DbtFileCreateRequest, user: CurrentUser = Depends(get_current_user)) -> dict:
    """Creates a new dbt model/macro/snapshot/test file inside the dbt project, via the
    dbt-runner service - lets the dbt UI's "New" panel author real project files instead
    of only running pre-existing ones."""
    try:
        return dbt_client.create_file(body.element_type, body.name, body.content, body.layer)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=exc.response.status_code, detail=exc.response.json().get("detail", str(exc)))
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach the dbt runner: {exc}")
