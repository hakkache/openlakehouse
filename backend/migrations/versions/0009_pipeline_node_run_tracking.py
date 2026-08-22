"""pipeline_node_runs: add started_at/sequence/iteration_index/parent_node_id
for the Run Log panel (chronological view + for_each iteration grouping)

Revision ID: 0009_pipeline_node_run_tracking
Revises: 0008_spark_code_executions
Create Date: 2026-08-04
"""

import sqlalchemy as sa

from alembic import op

revision = "0009_pipeline_node_run_tracking"
down_revision = "0008_spark_code_executions"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("pipeline_node_runs", sa.Column("started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("pipeline_node_runs", sa.Column("sequence", sa.Integer(), nullable=True))
    op.add_column("pipeline_node_runs", sa.Column("iteration_index", sa.Integer(), nullable=True))
    op.add_column("pipeline_node_runs", sa.Column("parent_node_id", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("pipeline_node_runs", "parent_node_id")
    op.drop_column("pipeline_node_runs", "iteration_index")
    op.drop_column("pipeline_node_runs", "sequence")
    op.drop_column("pipeline_node_runs", "started_at")
