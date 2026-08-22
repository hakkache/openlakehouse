"""query_executions: add engine column (trino/spark) for Data Explorer SQL editor

Revision ID: 0007_query_execution_engine
Revises: 0006_pipeline_dagster_link
Create Date: 2026-08-15
"""

import sqlalchemy as sa

from alembic import op

revision = "0007_query_execution_engine"
down_revision = "0006_pipeline_dagster_link"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "query_executions",
        sa.Column("engine", sa.String(20), nullable=False, server_default="trino"),
    )


def downgrade() -> None:
    op.drop_column("query_executions", "engine")
