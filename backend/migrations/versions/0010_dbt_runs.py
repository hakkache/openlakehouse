"""dbt_runs: history of dbt run/test/build invocations triggered from the dbt UI
page or a Pipeline Builder `dbt` node.

Revision ID: 0010_dbt_runs
Revises: 0009_pipeline_node_run_tracking
Create Date: 2026-08-04
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0010_dbt_runs"
down_revision = "0009_pipeline_node_run_tracking"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dbt_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("command", sa.String(20), nullable=False),
        sa.Column("select", sa.String(500), nullable=True),
        sa.Column("full_refresh", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("return_code", sa.Integer(), nullable=False),
        sa.Column("stdout", sa.Text(), nullable=False, server_default=""),
        sa.Column("stderr", sa.Text(), nullable=False, server_default=""),
        sa.Column("triggered_by", sa.String(255), nullable=False, server_default=""),
        sa.Column("pipeline_run_id", sa.String(64), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_dbt_runs_pipeline_run_id", "dbt_runs", ["pipeline_run_id"])


def downgrade() -> None:
    op.drop_index("ix_dbt_runs_pipeline_run_id", table_name="dbt_runs")
    op.drop_table("dbt_runs")
