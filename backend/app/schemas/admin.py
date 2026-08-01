from datetime import datetime

from pydantic import BaseModel


class AuditLogEntry(BaseModel):
    id: str
    user_id: str | None
    action: str
    resource: str
    resource_id: str | None
    status: str
    ip_address: str | None
    created_at: datetime


class RealmUser(BaseModel):
    id: str
    username: str
    email: str | None = None
    enabled: bool
    roles: list[str] = []


class AdminOverview(BaseModel):
    keycloak_available: bool
    users: list[RealmUser]
    audit_logs: list[AuditLogEntry]
