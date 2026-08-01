import re
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user, require_roles
from app.models.workspace import Workspace
from app.schemas.workspace import WorkspaceCreate, WorkspaceGitRepoUpdate, WorkspaceRead

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

CAN_MANAGE_WORKSPACES = require_roles("ADMIN", "DATA_ENGINEER")


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or str(uuid.uuid4())[:8]


@router.get("", response_model=list[WorkspaceRead])
def list_workspaces(
    db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> list[Workspace]:
    return list(db.scalars(select(Workspace).order_by(Workspace.created_at.desc())))


@router.post("", response_model=WorkspaceRead, status_code=201)
def create_workspace(
    payload: WorkspaceCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(CAN_MANAGE_WORKSPACES),
) -> Workspace:
    slug = slugify(payload.name)
    existing = db.scalar(select(Workspace).where(Workspace.slug == slug))
    if existing:
        raise HTTPException(status_code=409, detail=f"Workspace with slug '{slug}' already exists")

    workspace = Workspace(
        name=payload.name, slug=slug, description=payload.description, git_repo_url=payload.git_repo_url
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    record_audit(
        db,
        action="WORKSPACE_CREATED",
        resource="workspace",
        resource_id=str(workspace.id),
        request=request,
        user_id=user.subject,
    )
    return workspace


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace(
    workspace_id: uuid.UUID, db: Session = Depends(get_db), user: CurrentUser = Depends(get_current_user)
) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.patch("/{workspace_id}/git-repo", response_model=WorkspaceRead)
def update_workspace_git_repo(
    workspace_id: uuid.UUID,
    payload: WorkspaceGitRepoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(CAN_MANAGE_WORKSPACES),
) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    workspace.git_repo_url = payload.git_repo_url
    db.commit()
    db.refresh(workspace)
    record_audit(
        db,
        action="WORKSPACE_GIT_REPO_UPDATED",
        resource="workspace",
        resource_id=str(workspace.id),
        request=request,
        user_id=user.subject,
    )
    return workspace


@router.delete("/{workspace_id}", status_code=204)
def delete_workspace(
    workspace_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(CAN_MANAGE_WORKSPACES),
) -> None:
    workspace = db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    db.delete(workspace)
    db.commit()
    record_audit(
        db,
        action="WORKSPACE_DELETED",
        resource="workspace",
        resource_id=str(workspace_id),
        request=request,
        user_id=user.subject,
    )
