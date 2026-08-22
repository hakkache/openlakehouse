import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Pipeline(Base):
    __tablename__ = "pipelines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    definition: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pipeline_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pipelines.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="QUEUED")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    executed_by: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    # Set when this run was launched via Dagster (`run_pipeline_op`) so the Jobs page
    # can correlate a Dagster run with its underlying per-node execution detail.
    dagster_run_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PipelineNodeRun(Base):
    __tablename__ = "pipeline_node_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("pipeline_runs.id"), nullable=False)
    node_id: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Added for the Run Log panel (chronological view + for_each iteration grouping):
    # started_at + a monotonically increasing per-run `sequence` give a stable
    # chronological ordering (node_id alone repeats across for_each iterations so it
    # can't be used as a sort key on its own); iteration_index/parent_node_id identify
    # which for_each iteration (if any) a node run belongs to, so the UI can group
    # "iteration 0", "iteration 1", ... under their owning for_each node.
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sequence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    iteration_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_node_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
