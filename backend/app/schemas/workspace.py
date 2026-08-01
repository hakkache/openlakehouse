import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str = ""
    git_repo_url: str | None = None


class WorkspaceGitRepoUpdate(BaseModel):
    git_repo_url: str | None = None


class WorkspaceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str
    git_repo_url: str | None
    created_at: datetime
    updated_at: datetime
