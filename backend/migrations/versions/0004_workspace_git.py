"""workspaces: add git_repo_url column (Phase 16 - Gitea)

Revision ID: 0004_workspace_git
Revises: 0003_pipelines
Create Date: 2026-08-01
"""

import sqlalchemy as sa

from alembic import op

revision = "0004_workspace_git"
down_revision = "0003_pipelines"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("workspaces", sa.Column("git_repo_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("workspaces", "git_repo_url")
