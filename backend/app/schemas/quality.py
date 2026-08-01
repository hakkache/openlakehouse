from datetime import datetime

from pydantic import BaseModel


class QualityCheckResult(BaseModel):
    run_id: str
    pipeline_id: str
    pipeline_name: str
    node_id: str
    check_type: str
    status: str  # "SUCCESS" | "FAILED" | "SKIPPED" | "PENDING" | "RUNNING"
    message: str | None
    row_count: int | None
    started_at: datetime | None


class QualitySummary(BaseModel):
    total_checks: int
    passed: int
    failed: int
    warnings: int
    quality_score: float  # percentage, 0-100
    history: list[QualityCheckResult]
