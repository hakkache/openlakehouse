import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.connection_tester import run_connection_test
from app.core.crypto import decrypt, encrypt
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user, require_roles
from app.models.connection import Connection
from app.schemas.connection import (
    ConnectionCreate,
    ConnectionRead,
    ConnectionTestRequest,
    ConnectionTestResult,
    ConnectionUpdate,
)

router = APIRouter(prefix="/connections", tags=["connections"])

CAN_MANAGE_CONNECTIONS = require_roles("ADMIN", "DATA_ENGINEER")


@router.get("", response_model=list[ConnectionRead])
def list_connections(
    db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> list[Connection]:
    return list(db.scalars(select(Connection).order_by(Connection.created_at.desc())))


@router.post("", response_model=ConnectionRead, status_code=201)
def create_connection(
    payload: ConnectionCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(CAN_MANAGE_CONNECTIONS),
) -> Connection:
    connection = Connection(
        name=payload.name,
        type=payload.type,
        config=payload.config,
        encrypted_password=encrypt(payload.password) if payload.password else None,
        created_by=user.username,
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)
    record_audit(
        db,
        action="CONNECTION_CREATED",
        resource="connection",
        resource_id=str(connection.id),
        request=request,
        user_id=user.subject,
    )
    return connection


@router.get("/{connection_id}", response_model=ConnectionRead)
def get_connection(
    connection_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> Connection:
    connection = db.get(Connection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    return connection


@router.put("/{connection_id}", response_model=ConnectionRead)
def update_connection(
    connection_id: uuid.UUID,
    payload: ConnectionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(CAN_MANAGE_CONNECTIONS),
) -> Connection:
    connection = db.get(Connection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    if payload.name is not None:
        connection.name = payload.name
    if payload.config is not None:
        connection.config = payload.config
    if payload.password is not None:
        connection.encrypted_password = encrypt(payload.password) if payload.password else None
    db.commit()
    db.refresh(connection)
    record_audit(
        db,
        action="CONNECTION_UPDATED",
        resource="connection",
        resource_id=str(connection.id),
        request=request,
        user_id=user.subject,
    )
    return connection


@router.delete("/{connection_id}", status_code=204)
def delete_connection(
    connection_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(CAN_MANAGE_CONNECTIONS),
) -> None:
    connection = db.get(Connection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(connection)
    db.commit()
    record_audit(
        db,
        action="CONNECTION_DELETED",
        resource="connection",
        resource_id=str(connection_id),
        request=request,
        user_id=user.subject,
    )


@router.post("/test", response_model=ConnectionTestResult)
def test_ad_hoc_connection(
    payload: ConnectionTestRequest, user: CurrentUser = Depends(CAN_MANAGE_CONNECTIONS)
) -> ConnectionTestResult:
    """Real connection test against arbitrary (not-yet-saved) connection details."""
    success, message, latency_ms = run_connection_test(payload.type, payload.config, payload.password)
    return ConnectionTestResult(success=success, message=message, latency_ms=latency_ms)


@router.post("/{connection_id}/test", response_model=ConnectionTestResult)
def test_saved_connection(
    connection_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(CAN_MANAGE_CONNECTIONS),
) -> ConnectionTestResult:
    """Real connection test against a saved connection's stored (decrypted) credentials."""
    connection = db.get(Connection, connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    password = decrypt(connection.encrypted_password) if connection.encrypted_password else None
    success, message, latency_ms = run_connection_test(connection.type, connection.config, password)

    connection.last_test_status = "SUCCESS" if success else "FAILED"
    connection.last_test_message = message
    connection.last_test_latency_ms = latency_ms
    connection.last_tested_at = datetime.now(timezone.utc)
    db.commit()

    record_audit(
        db,
        action="CONNECTION_TESTED",
        resource="connection",
        resource_id=str(connection.id),
        status="SUCCESS" if success else "FAILED",
        request=request,
        user_id=user.subject,
    )
    return ConnectionTestResult(success=success, message=message, latency_ms=latency_ms)
