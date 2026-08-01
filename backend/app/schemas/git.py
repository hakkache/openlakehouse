from pydantic import BaseModel


class GitRepo(BaseModel):
    id: int
    name: str
    full_name: str
    owner: str
    description: str
    clone_url: str
    html_url: str
    default_branch: str
    updated_at: str


class GitBranch(BaseModel):
    name: str
    commit_sha: str


class GitCommit(BaseModel):
    sha: str
    message: str
    author: str
    date: str


class GitStatus(BaseModel):
    available: bool
    repos: list[GitRepo]


class GitRepoCreate(BaseModel):
    name: str
    description: str = ""
