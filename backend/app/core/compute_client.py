"""Real compute-engine status helpers backing the Compute page.

Each function calls the given engine's own REST API directly (Spark master's
JSON UI endpoint, Trino's cluster/query APIs, Jupyter's server API) and returns
`None` if the engine is unreachable, rather than raising or faking data.
"""

from __future__ import annotations

import httpx

from app.core.config import get_settings


def get_spark_status() -> dict | None:
    settings = get_settings()
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(f"{settings.spark_master_url}/json/")
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    workers = data.get("workers", [])
    return {
        "status": data.get("status", "UNKNOWN"),
        "workers_alive": sum(1 for w in workers if w.get("state") == "ALIVE"),
        "workers_total": len(workers),
        "cores_total": data.get("cores", 0),
        "cores_used": data.get("coresused", 0),
        "memory_total_mb": data.get("memory", 0),
        "memory_used_mb": data.get("memoryused", 0),
        "active_apps": len(data.get("activeapps", [])),
        "completed_apps": len(data.get("completedapps", [])),
    }


def get_trino_status() -> dict | None:
    settings = get_settings()
    base = f"http://{settings.trino_host}:{settings.trino_port}"
    headers = {"X-Trino-User": "openlakehouse"}
    try:
        with httpx.Client(timeout=4.0) as client:
            info = client.get(f"{base}/v1/info")
            info.raise_for_status()
            nodes = client.get(f"{base}/v1/node", headers=headers)
            nodes.raise_for_status()
            queries = client.get(f"{base}/v1/query", headers=headers)
            queries.raise_for_status()
    except httpx.HTTPError:
        return None

    node_list = nodes.json() if nodes.content else []
    query_list = queries.json() if queries.content else []
    running = sum(1 for q in query_list if q.get("state") == "RUNNING")
    queued = sum(1 for q in query_list if q.get("state") == "QUEUED")

    return {
        "status": "RUNNING" if not info.json().get("starting", False) else "STARTING",
        "version": info.json().get("nodeVersion", {}).get("version", "unknown"),
        "workers_total": len(node_list),
        "running_queries": running,
        "queued_queries": queued,
        "total_queries_tracked": len(query_list),
    }


def get_jupyter_status() -> dict | None:
    settings = get_settings()
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(
                f"{settings.jupyter_url}/jupyter/api/status",
                params={"token": settings.jupyter_token},
            )
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    return {
        "status": "RUNNING",
        "kernels_running": data.get("kernels", 0),
        "connections": data.get("connections", 0),
    }
