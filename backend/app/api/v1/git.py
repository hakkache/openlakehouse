from fastapi import APIRouter, Depends, HTTPException

from app.core import gitea_client
from app.core.security import CurrentUser, get_current_user, require_roles
from app.schemas.git import GitBranch, GitCommit, GitRepo, GitRepoCreate, GitStatus

router = APIRouter(prefix="/git", tags=["git"])

CAN_MANAGE_GIT = require_roles("ADMIN", "DATA_ENGINEER")


@router.get("/status", response_model=GitStatus)
def get_git_status(user: CurrentUser = Depends(get_current_user)) -> GitStatus:
    """Real Gitea repository list (no simulated data)."""
    if not gitea_client.is_available():
        return GitStatus(available=False, repos=[])

    repos = [
        GitRepo(
            id=r["id"],
            name=r["name"],
            full_name=r["full_name"],
            owner=r["owner"]["login"],
            description=r.get("description", "") or "",
            clone_url=r["clone_url"],
            html_url=r["html_url"],
            default_branch=r.get("default_branch", "main"),
            updated_at=r.get("updated_at", ""),
        )
        for r in gitea_client.list_repos()
    ]
    return GitStatus(available=True, repos=repos)


@router.get("/repos/{owner}/{repo}/branches", response_model=list[GitBranch])
def get_branches(owner: str, repo: str, user: CurrentUser = Depends(get_current_user)) -> list[GitBranch]:
    branches = gitea_client.list_branches(owner, repo)
    return [GitBranch(name=b["name"], commit_sha=b["commit"]["id"]) for b in branches]


@router.get("/repos/{owner}/{repo}/commits", response_model=list[GitCommit])
def get_commits(owner: str, repo: str, user: CurrentUser = Depends(get_current_user)) -> list[GitCommit]:
    commits = gitea_client.list_commits(owner, repo)
    return [
        GitCommit(
            sha=c["sha"][:8],
            message=c["commit"]["message"].splitlines()[0] if c["commit"]["message"] else "",
            author=c["commit"]["author"]["name"],
            date=c["commit"]["author"]["date"],
        )
        for c in commits
    ]


@router.post("/repos", response_model=GitRepo, status_code=201)
def create_repo(payload: GitRepoCreate, user: CurrentUser = Depends(CAN_MANAGE_GIT)) -> GitRepo:
    try:
        r = gitea_client.create_repo(payload.name, payload.description)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return GitRepo(
        id=r["id"],
        name=r["name"],
        full_name=r["full_name"],
        owner=r["owner"]["login"],
        description=r.get("description", "") or "",
        clone_url=r["clone_url"],
        html_url=r["html_url"],
        default_branch=r.get("default_branch", "main"),
        updated_at=r.get("updated_at", ""),
    )
