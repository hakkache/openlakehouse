"""Small HTTP wrapper around the dbt CLI, so the backend (and therefore the Pipeline
Builder's `dbt` node kind) can trigger `dbt run`/`test`/`build` over the network instead
of needing a docker socket / `docker exec` from inside the backend container. Mirrors
the thin-proxy pattern already used for Dagster (app/core/dagster_client.py) - this
service owns the dbt CLI, the backend just calls it over HTTP.

Runs as the dbt container's foreground process (replacing the old `tail -f /dev/null`);
`docker compose exec dbt dbt ...` one-off commands still work fine alongside it since
`exec` starts an independent process in the same container.
"""

import json
import re
import subprocess
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="openlakehouse-dbt-runner")

PROJECT_DIR = "/usr/app/dbt"
PROJECT_ROOT = Path(PROJECT_DIR).resolve()
TARGET_MANIFEST = Path(PROJECT_DIR) / "target" / "manifest.json"

# Where each kind of dbt "element" the UI lets you create lives on disk.
MODEL_LAYERS = {"staging", "intermediate", "marts"}
ELEMENT_DIRS = {"macro": "macros", "snapshot": "snapshots", "test": "tests"}
NAME_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9_]*$")


class RunRequest(BaseModel):
    command: Literal["run", "test", "build"] = "run"
    select: str | None = None
    full_refresh: bool = False


class RunResult(BaseModel):
    success: bool
    return_code: int
    stdout: str
    stderr: str


class FileCreateRequest(BaseModel):
    element_type: Literal["model", "macro", "snapshot", "test"]
    layer: Literal["staging", "intermediate", "marts"] | None = None
    name: str
    content: str


class FileNode(BaseModel):
    path: str
    element_type: str
    name: str


class FileContent(BaseModel):
    path: str
    content: str


def _run_dbt(args: list[str], timeout: int = 600) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["dbt", "--quiet", *args],
        cwd=PROJECT_DIR,
        capture_output=True,
        text=True,
        timeout=timeout,
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/run", response_model=RunResult)
def run(req: RunRequest) -> RunResult:
    args = [req.command]
    if req.select:
        args += ["--select", req.select]
    if req.full_refresh and req.command in ("run", "build"):
        args += ["--full-refresh"]
    proc = _run_dbt(args)
    return RunResult(success=proc.returncode == 0, return_code=proc.returncode, stdout=proc.stdout, stderr=proc.stderr)


@app.get("/models")
def list_models() -> list[dict]:
    """Lists dbt models via `dbt ls` (works even with no prior `dbt run`), falling back
    to a previously generated manifest.json for docs/columns if `dbt ls` fails (e.g.
    the warehouse is briefly unreachable)."""
    try:
        proc = _run_dbt(
            ["ls", "--resource-type", "model", "--output", "json", "--output-keys", "name resource_type description original_file_path schema"],
            timeout=60,
        )
        models = []
        for line in proc.stdout.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                models.append(json.loads(line))
            except ValueError:
                continue
        if models:
            return models
    except (subprocess.TimeoutExpired, OSError):
        pass

    if TARGET_MANIFEST.exists():
        try:
            manifest = json.loads(TARGET_MANIFEST.read_text())
            return [
                {
                    "name": node.get("name"),
                    "resource_type": node.get("resource_type"),
                    "description": node.get("description", ""),
                    "original_file_path": node.get("original_file_path"),
                    "schema": node.get("schema"),
                }
                for node in manifest.get("nodes", {}).values()
                if node.get("resource_type") == "model"
            ]
        except (ValueError, OSError):
            pass
    return []


def _resolve_within_project(rel_path: str) -> Path:
    """Resolves a path relative to PROJECT_DIR and 400s on any attempt to escape it
    (e.g. `../../etc/passwd`) - this endpoint takes an arbitrary path from the caller."""
    full = (Path(PROJECT_DIR) / rel_path).resolve()
    if not full.is_relative_to(PROJECT_ROOT):
        raise HTTPException(status_code=400, detail="path escapes the dbt project directory")
    return full


def _target_path(req: FileCreateRequest) -> Path:
    if not NAME_RE.match(req.name):
        raise HTTPException(
            status_code=400,
            detail="name must start with a letter and contain only letters/digits/underscores",
        )
    if req.element_type == "model":
        if req.layer not in MODEL_LAYERS:
            raise HTTPException(status_code=400, detail=f"layer must be one of {sorted(MODEL_LAYERS)}")
        rel = Path("models") / req.layer / f"{req.name}.sql"
    else:
        rel = Path(ELEMENT_DIRS[req.element_type]) / f"{req.name}.sql"
    return _resolve_within_project(str(rel))


@app.get("/files", response_model=list[FileNode])
def list_files() -> list[FileNode]:
    """Lists every model/macro/snapshot/test .sql file currently in the project, for the
    dbt UI's project-files browser (separate from /models, which only lists compiled
    models with their dbt-ls-derived docs/schema)."""
    root = Path(PROJECT_DIR)
    out: list[FileNode] = []
    for layer in sorted(MODEL_LAYERS):
        d = root / "models" / layer
        if d.is_dir():
            for f in sorted(d.glob("*.sql")):
                out.append(FileNode(path=str(f.relative_to(root)).replace("\\", "/"), element_type="model", name=f.stem))
    for element_type, dirname in ELEMENT_DIRS.items():
        d = root / dirname
        if d.is_dir():
            for f in sorted(d.glob("*.sql")):
                out.append(FileNode(path=str(f.relative_to(root)).replace("\\", "/"), element_type=element_type, name=f.stem))
    return out


@app.get("/files/content", response_model=FileContent)
def get_file_content(path: str) -> FileContent:
    full = _resolve_within_project(path)
    if not full.is_file():
        raise HTTPException(status_code=404, detail=f"{path} not found")
    return FileContent(path=path, content=full.read_text(encoding="utf-8"))


@app.post("/files", response_model=FileContent, status_code=201)
def create_file(req: FileCreateRequest) -> FileContent:
    full = _target_path(req)
    if full.exists():
        raise HTTPException(status_code=409, detail=f"{full.relative_to(PROJECT_ROOT)} already exists")
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(req.content, encoding="utf-8")
    rel = str(full.relative_to(PROJECT_ROOT)).replace("\\", "/")
    return FileContent(path=rel, content=req.content)
