"""Thin real proxy client for the Prometheus HTTP query API."""

from __future__ import annotations

import httpx

from app.core.config import get_settings


def is_available() -> bool:
    settings = get_settings()
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(f"{settings.prometheus_url}/-/healthy")
            return resp.status_code == 200
    except httpx.HTTPError:
        return False


def get_target_health() -> list[dict]:
    """Real per-job/instance scrape health, straight from Prometheus's own `up` metric."""
    settings = get_settings()
    try:
        with httpx.Client(timeout=6.0) as client:
            resp = client.get(f"{settings.prometheus_url}/api/v1/query", params={"query": "up"})
            resp.raise_for_status()
            result = resp.json().get("data", {}).get("result", [])
    except httpx.HTTPError:
        return []

    return [
        {
            "job": item["metric"].get("job", "unknown"),
            "instance": item["metric"].get("instance", "unknown"),
            "up": item["value"][1] == "1",
        }
        for item in result
    ]
