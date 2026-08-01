import uuid

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def record_audit(
    db: Session,
    *,
    action: str,
    resource: str,
    resource_id: str | None = None,
    status: str = "SUCCESS",
    request: Request | None = None,
    user_id: str | None = None,
) -> None:
    entry = AuditLog(
        user_id=uuid.UUID(user_id) if user_id else None,
        action=action,
        resource=resource,
        resource_id=resource_id,
        status=status,
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(entry)
    db.commit()
