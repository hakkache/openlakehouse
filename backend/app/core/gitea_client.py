"""Thin real proxy client for the Gitea REST API.

Authenticates with the bootstrap admin account created by the `gitea-init`
one-off container. No mocked data - every function performs a live HTTP call.
"""

from __future__ import annotations

import httpx

from app.core.config import get_settings


def _client() -> httpx.Client:
    settings = get_settings()
    return httpx.Client(
        base_url=f"{settings.gitea_url}/api/v1",
        auth=(settings.gitea_admin_user, settings.gitea_admin_password),
        timeout=6.0,
    )


def is_available() -> bool:
    try:
        with _client() as client:
            resp = client.get("/version")
            return resp.status_code == 200
    except httpx.HTTPError:
        return False


def list_repos() -> list[dict]:
    try:
        with _client() as client:
            resp = client.get("/repos/search", params={"limit": 50})
            resp.raise_for_status()
            return resp.json().get("data", [])
    except httpx.HTTPError:
        return []


def list_branches(owner: str, repo: str) -> list[dict]:
    try:
        with _client() as client:
            resp = client.get(f"/repos/{owner}/{repo}/branches")
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError:
        return []


def list_commits(owner: str, repo: str) -> list[dict]:
    try:
        with _client() as client:
            resp = client.get(f"/repos/{owner}/{repo}/commits", params={"limit": 20})
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError:
        return []


def create_repo(name: str, description: str = "") -> dict | None:
    try:
        with _client() as client:
            resp = client.post(
                "/user/repos",
                json={"name": name, "description": description, "auto_init": True, "private": False},
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as exc:
        detail = exc.response.text if isinstance(exc, httpx.HTTPStatusError) else str(exc)
        raise ValueError(detail) from exc
