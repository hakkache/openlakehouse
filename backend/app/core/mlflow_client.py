"""Thin real proxy client for the MLflow REST API (tracking + model registry).

No mocked data - every function performs a live HTTP call against the MLflow
tracking server and returns `None`/empty results if it is unreachable.
"""

from __future__ import annotations

import httpx

from app.core.config import get_settings


def _client() -> httpx.Client:
    return httpx.Client(base_url=get_settings().mlflow_url, timeout=6.0)


def is_available() -> bool:
    try:
        with _client() as client:
            resp = client.get("/health")
            return resp.status_code == 200
    except httpx.HTTPError:
        return False


def list_experiments() -> list[dict]:
    try:
        with _client() as client:
            resp = client.post("/api/2.0/mlflow/experiments/search", json={"max_results": 100})
            resp.raise_for_status()
            return resp.json().get("experiments", [])
    except httpx.HTTPError:
        return []


def list_runs(experiment_ids: list[str]) -> list[dict]:
    try:
        with _client() as client:
            resp = client.post(
                "/api/2.0/mlflow/runs/search",
                json={"experiment_ids": experiment_ids, "max_results": 100},
            )
            resp.raise_for_status()
            return resp.json().get("runs", [])
    except httpx.HTTPError:
        return []


def list_registered_models() -> list[dict]:
    try:
        with _client() as client:
            resp = client.post("/api/2.0/mlflow/registered-models/search", json={"max_results": 100})
            resp.raise_for_status()
            return resp.json().get("registered_models", [])
    except httpx.HTTPError:
        return []
