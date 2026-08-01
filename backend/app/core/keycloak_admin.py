"""Real Keycloak Admin REST API client (for the Admin page's user list)."""

from __future__ import annotations

import httpx

from app.core.config import get_settings


def _get_admin_token() -> str | None:
    settings = get_settings()
    try:
        with httpx.Client(timeout=6.0) as client:
            resp = client.post(
                f"{settings.keycloak_internal_url}/realms/master/protocol/openid-connect/token",
                data={
                    "client_id": "admin-cli",
                    "grant_type": "password",
                    "username": settings.keycloak_admin_user,
                    "password": settings.keycloak_admin_password,
                },
            )
            resp.raise_for_status()
            return resp.json().get("access_token")
    except httpx.HTTPError:
        return None


def list_realm_users(limit: int = 50) -> list[dict]:
    token = _get_admin_token()
    if token is None:
        return []
    settings = get_settings()
    try:
        with httpx.Client(timeout=6.0) as client:
            resp = client.get(
                f"{settings.keycloak_internal_url}/admin/realms/{settings.keycloak_realm}/users",
                params={"max": limit},
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            users = resp.json()

            for user in users:
                roles_resp = client.get(
                    f"{settings.keycloak_internal_url}/admin/realms/{settings.keycloak_realm}"
                    f"/users/{user['id']}/role-mappings/realm",
                    headers={"Authorization": f"Bearer {token}"},
                )
                user["roles"] = [r["name"] for r in roles_resp.json()] if roles_resp.status_code == 200 else []
            return users
    except httpx.HTTPError:
        return []


def is_available() -> bool:
    return _get_admin_token() is not None
