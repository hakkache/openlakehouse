"""Thin real proxy client for Dagster's GraphQL API (job status/trigger/cancel for the Jobs page)."""

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

_REPOSITORIES_QUERY = """
query Repositories {
  repositoriesOrError {
    __typename
    ... on RepositoryConnection {
      nodes {
        name
        location { name }
      }
    }
  }
}
"""

_LAUNCH_RUN_MUTATION = """
mutation LaunchRun($repositoryLocationName: String!, $repositoryName: String!, $jobName: String!, $runConfigData: RunConfigData!) {
  launchRun(executionParams: {
    selector: {
      repositoryLocationName: $repositoryLocationName
      repositoryName: $repositoryName
      jobName: $jobName
    }
    runConfigData: $runConfigData
  }) {
    __typename
    ... on LaunchRunSuccess {
      run { runId }
    }
    ... on RunConfigValidationInvalid {
      errors { message }
    }
    ... on PythonError {
      message
    }
  }
}
"""

_TERMINATE_RUN_MUTATION = """
mutation TerminateRun($runId: String!) {
  terminateRun(runId: $runId) {
    __typename
    ... on TerminateRunSuccess { run { runId } }
    ... on TerminateRunFailure { message }
    ... on RunNotFoundError { runId }
    ... on PythonError { message }
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
    return _post(_REPOSITORIES_QUERY) is not None


def _repository_selector() -> dict | None:
    """Resolve the single code location/repository name pair needed by launchRun's selector."""
    data = _post(_REPOSITORIES_QUERY)
    if not data:
        return None
    repos_or_error = data.get("repositoriesOrError", {})
    if repos_or_error.get("__typename") != "RepositoryConnection":
        return None
    nodes = repos_or_error.get("nodes", [])
    if not nodes:
        return None
    node = nodes[0]
    location = node.get("location") or {}
    return {"repositoryLocationName": location.get("name", ""), "repositoryName": node.get("name", "")}


def list_recent_runs(limit: int = 20) -> list[dict]:
    data = _post(_RUNS_QUERY, {"limit": limit})
    if not data:
        return []
    runs_or_error = data.get("runsOrError", {})
    if runs_or_error.get("__typename") != "Runs":
        return []
    return runs_or_error.get("results", [])


def trigger_run(pipeline_id: str, job_name: str = "run_pipeline_job") -> str | None:
    """Launch a real, Dagster-tracked run of `job_name` for the given pipeline_id."""
    selector = _repository_selector()
    if not selector:
        return None
    data = _post(
        _LAUNCH_RUN_MUTATION,
        {
            "repositoryLocationName": selector["repositoryLocationName"],
            "repositoryName": selector["repositoryName"],
            "jobName": job_name,
            "runConfigData": {"ops": {"run_pipeline_op": {"config": {"pipeline_id": pipeline_id}}}},
        },
    )
    if not data:
        return None
    result = data.get("launchRun", {})
    if result.get("__typename") == "LaunchRunSuccess":
        return result["run"]["runId"]
    return None


def terminate_run(run_id: str) -> bool:
    data = _post(_TERMINATE_RUN_MUTATION, {"runId": run_id})
    if not data:
        return False
    return data.get("terminateRun", {}).get("__typename") == "TerminateRunSuccess"

