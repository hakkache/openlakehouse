"""pipeline_runs: add dagster_run_id link (Phase - Jobs UX improvements)

Revision ID: 0006_pipeline_dagster_link
Revises: 0005_connections
Create Date: 2026-08-02
"""

import sqlalchemy as sa

from alembic import op

revision = "0006_pipeline_dagster_link"
down_revision = "0005_connections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pipeline_runs", sa.Column("dagster_run_id", sa.String(64), nullable=True))
    op.create_index("ix_pipeline_runs_dagster_run_id", "pipeline_runs", ["dagster_run_id"])


def downgrade() -> None:
    op.drop_index("ix_pipeline_runs_dagster_run_id", table_name="pipeline_runs")
    op.drop_column("pipeline_runs", "dagster_run_id")
