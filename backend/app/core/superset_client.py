"""Thin real proxy client for the Superset REST API.

Logs in with the local admin account (Superset has no Keycloak/SSO integration
yet, consistent with Phase 14's documented limitation) to obtain a bearer token,
then lists real dashboards. No mocked data.
"""

from __future__ import annotations

import httpx

from app.core.config import get_settings


def _login() -> str | None:
    settings = get_settings()
    try:
        with httpx.Client(base_url=settings.superset_url, timeout=6.0) as client:
            resp = client.post(
                "/api/v1/security/login",
                json={
                    "username": settings.superset_admin_user,
                    "password": settings.superset_admin_password,
                    "provider": "db",
                    "refresh": True,
                },
            )
            resp.raise_for_status()
            return resp.json().get("access_token")
    except httpx.HTTPError:
        return None


def is_available() -> bool:
    return _login() is not None


def list_dashboards() -> list[dict]:
    token = _login()
    if token is None:
        return []
    settings = get_settings()
    try:
        with httpx.Client(base_url=settings.superset_url, timeout=6.0) as client:
            resp = client.get(
                "/api/v1/dashboard/",
                params={"q": "(order_column:changed_on_delta_humanized,order_direction:desc,page_size:50)"},
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            results = resp.json().get("result", [])
    except httpx.HTTPError:
        return []

    return [
        {
            "id": d["id"],
            "title": d.get("dashboard_title", ""),
            "url": f"{settings.superset_public_url}{d.get('url', '')}",
            "published": d.get("published", False),
            "changed_on": d.get("changed_on_delta_humanized", ""),
        }
        for d in results
    ]
