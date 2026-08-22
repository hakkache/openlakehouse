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


def _spark_app_row(app: dict, running: bool) -> dict:
    return {
        "id": app.get("id", ""),
        "name": app.get("name", ""),
        "user": app.get("user", ""),
        "cores": app.get("cores", 0),
        "memory_per_executor_mb": app.get("memoryperslave", app.get("memoryperexecutor", 0)),
        "submit_date": app.get("submitdate", ""),
        "state": app.get("state", "UNKNOWN"),
        "duration_ms": app.get("duration", 0),
        "running": running,
    }


def get_spark_applications() -> list[dict] | None:
    """Real, killable Spark Standalone applications (active + completed), from the
    master's own `/json/` endpoint - the same data its web UI table renders."""
    settings = get_settings()
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(f"{settings.spark_master_url}/json/")
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    active = [_spark_app_row(a, running=True) for a in data.get("activeapps", [])]
    completed = [_spark_app_row(a, running=False) for a in data.get("completedapps", [])]
    return active + completed


def kill_spark_application(app_id: str) -> bool:
    """Kill a running Spark Standalone application via the same `/app/kill/` form
    endpoint the Master web UI's own "kill" link posts to (requires the master's
    default `spark.ui.killEnabled=true`)."""
    settings = get_settings()
    try:
        with httpx.Client(timeout=4.0, follow_redirects=True) as client:
            resp = client.post(
                f"{settings.spark_master_url}/app/kill/",
                data={"id": app_id, "terminate": "true"},
            )
    except httpx.HTTPError:
        return False
    return resp.status_code < 400


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


def get_trino_queries() -> list[dict] | None:
    """Real, killable Trino queries from `GET /v1/query` - includes query text,
    user, state and elapsed/queued time for every query Trino is still tracking."""
    settings = get_settings()
    base = f"http://{settings.trino_host}:{settings.trino_port}"
    headers = {"X-Trino-User": "openlakehouse"}
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(f"{base}/v1/query", headers=headers)
            resp.raise_for_status()
    except httpx.HTTPError:
        return None

    query_list = resp.json() if resp.content else []
    rows = []
    for q in query_list:
        stats = q.get("queryStats", {}) or {}
        query_text = q.get("query", "")
        rows.append(
            {
                "id": q.get("queryId", ""),
                "query": query_text[:200],
                "user": q.get("session", {}).get("user", ""),
                "state": q.get("state", "UNKNOWN"),
                "elapsed_time": stats.get("elapsedTime", ""),
                "queued_time": stats.get("queuedTime", ""),
            }
        )
    return rows


def kill_trino_query(query_id: str) -> bool:
    """Cancel a running/queued Trino query via its documented
    `DELETE /v1/query/{queryId}` endpoint."""
    settings = get_settings()
    base = f"http://{settings.trino_host}:{settings.trino_port}"
    headers = {"X-Trino-User": "openlakehouse"}
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.delete(f"{base}/v1/query/{query_id}", headers=headers)
    except httpx.HTTPError:
        return False
    return resp.status_code < 400


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


def get_jupyter_kernels() -> list[dict] | None:
    """Real, killable Jupyter kernels from `GET /api/kernels` - one row per
    notebook/console kernel currently alive on the server."""
    settings = get_settings()
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(
                f"{settings.jupyter_url}/jupyter/api/kernels",
                params={"token": settings.jupyter_token},
            )
            resp.raise_for_status()
            data = resp.json()
    except (httpx.HTTPError, ValueError):
        return None

    return [
        {
            "id": k.get("id", ""),
            "name": k.get("name", ""),
            "execution_state": k.get("execution_state", "unknown"),
            "connections": k.get("connections", 0),
            "last_activity": k.get("last_activity", ""),
        }
        for k in data
    ]


def kill_jupyter_kernel(kernel_id: str) -> bool:
    """Shut down a Jupyter kernel via its documented `DELETE /api/kernels/{id}`."""
    settings = get_settings()
    try:
        with httpx.Client(timeout=4.0) as client:
            resp = client.delete(
                f"{settings.jupyter_url}/jupyter/api/kernels/{kernel_id}",
                params={"token": settings.jupyter_token},
            )
    except httpx.HTTPError:
        return False
    return resp.status_code < 400

