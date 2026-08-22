"""Thin real proxy client for the dbt-runner FastAPI wrapper (infra/dbt/server.py),
mirroring app/core/dagster_client.py's pattern - this backend never shells out to dbt
itself, it always calls the dbt container's own HTTP API."""

from __future__ import annotations

import httpx

from app.core.config import get_settings


def is_available() -> bool:
    settings = get_settings()
    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(f"{settings.dbt_runner_url}/health")
            return resp.status_code == 200
    except httpx.HTTPError:
        return False


def list_models() -> list[dict]:
    settings = get_settings()
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(f"{settings.dbt_runner_url}/models")
        resp.raise_for_status()
        return resp.json()


def run(command: str, select: str | None, full_refresh: bool = False) -> dict:
    """Runs `dbt <command> --select <select>` synchronously. Callers should expect this
    to take anywhere from a few seconds to a few minutes depending on the selection."""
    settings = get_settings()
    with httpx.Client(timeout=600.0) as client:
        resp = client.post(
            f"{settings.dbt_runner_url}/run",
            json={"command": command, "select": select, "full_refresh": full_refresh},
        )
        resp.raise_for_status()
        return resp.json()


def list_files() -> list[dict]:
    settings = get_settings()
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(f"{settings.dbt_runner_url}/files")
        resp.raise_for_status()
        return resp.json()


def get_file(path: str) -> dict:
    settings = get_settings()
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(f"{settings.dbt_runner_url}/files/content", params={"path": path})
        resp.raise_for_status()
        return resp.json()


def create_file(element_type: str, name: str, content: str, layer: str | None = None) -> dict:
    settings = get_settings()
    body = {"element_type": element_type, "name": name, "content": content, "layer": layer}
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(f"{settings.dbt_runner_url}/files", json=body)
        resp.raise_for_status()
        return resp.json()
