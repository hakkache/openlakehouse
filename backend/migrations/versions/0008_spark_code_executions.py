"""spark_code_executions: table for ad-hoc PySpark code runs in Data Explorer

Revision ID: 0008_spark_code_executions
Revises: 0007_query_execution_engine
Create Date: 2026-08-02
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "0008_spark_code_executions"
down_revision = "0007_query_execution_engine"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "spark_code_executions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code_text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="RUNNING"),
        sa.Column("output", sa.Text(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("executed_by", sa.String(255), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("spark_code_executions")
