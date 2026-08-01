from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import keycloak_admin
from app.core.database import get_db
from app.core.security import CurrentUser, require_roles
from app.models.audit_log import AuditLog
from app.schemas.admin import AdminOverview, AuditLogEntry, RealmUser

router = APIRouter(prefix="/admin", tags=["admin"])

CAN_VIEW_ADMIN = require_roles("ADMIN")


@router.get("/overview", response_model=AdminOverview)
def get_admin_overview(
    db: Session = Depends(get_db), user: CurrentUser = Depends(CAN_VIEW_ADMIN)
) -> AdminOverview:
    """Real Keycloak realm users + real audit log history (no simulated data)."""
    keycloak_available = keycloak_admin.is_available()
    users = (
        [
            RealmUser(
                id=u["id"],
                username=u.get("username", ""),
                email=u.get("email"),
                enabled=u.get("enabled", False),
                roles=u.get("roles", []),
            )
            for u in keycloak_admin.list_realm_users()
        ]
        if keycloak_available
        else []
    )

    logs = list(db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(100)))
    audit_logs = [
        AuditLogEntry(
            id=str(log.id),
            user_id=str(log.user_id) if log.user_id else None,
            action=log.action,
            resource=log.resource,
            resource_id=log.resource_id,
            status=log.status,
            ip_address=log.ip_address,
            created_at=log.created_at,
        )
        for log in logs
    ]

    return AdminOverview(keycloak_available=keycloak_available, users=users, audit_logs=audit_logs)
