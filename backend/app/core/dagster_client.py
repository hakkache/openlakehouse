"""Thin real proxy client for Dagster's GraphQL API (job/run status for the Jobs page)."""

from __future__ import annotations

import httpx

from app.core.config import get_settings

_RUNS_QUERY = """
query RecentRuns($limit: Int!) {
  runsOrError(limit: $limit) {
    __typename
    ... on Runs {
      results {
        runId
        jobName
        status
        startTime
        endTime
      }
    }
  }
}
"""

_JOBS_QUERY = """
query Jobs {
  repositoriesOrError {
    __typename
    ... on RepositoryConnection {
      nodes {
        name
        jobs {
          name
        }
        schedules {
          name
          cronSchedule
          scheduleState { status }
        }
      }
    }
  }
}
"""


def _post(query: str, variables: dict | None = None) -> dict | None:
    settings = get_settings()
    try:
        with httpx.Client(timeout=6.0) as client:
            resp = client.post(
                f"{settings.dagster_url}/graphql",
                json={"query": query, "variables": variables or {}},
            )
            resp.raise_for_status()
            body = resp.json()
            if "errors" in body:
                return None
            return body.get("data")
    except httpx.HTTPError:
        return None


def is_available() -> bool:
    return _post(_JOBS_QUERY) is not None


def list_jobs_and_schedules() -> list[dict]:
    data = _post(_JOBS_QUERY)
    if not data:
        return []
    repos_or_error = data.get("repositoriesOrError", {})
    if repos_or_error.get("__typename") != "RepositoryConnection":
        return []
    return repos_or_error.get("nodes", [])


def list_recent_runs(limit: int = 20) -> list[dict]:
    data = _post(_RUNS_QUERY, {"limit": limit})
    if not data:
        return []
    runs_or_error = data.get("runsOrError", {})
    if runs_or_error.get("__typename") != "Runs":
        return []
    return runs_or_error.get("results", [])
