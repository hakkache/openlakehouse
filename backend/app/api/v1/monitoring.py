from fastapi import APIRouter, Depends

from app.core import prometheus_client
from app.core.config import get_settings
from app.core.security import CurrentUser, get_current_user
from app.schemas.monitoring import MonitoringStatus, TargetHealth

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.get("/status", response_model=MonitoringStatus)
def get_monitoring_status(user: CurrentUser = Depends(get_current_user)) -> MonitoringStatus:
    """Real Prometheus target health for every scraped service (no simulated data)."""
    settings = get_settings()
    available = prometheus_client.is_available()
    targets = [TargetHealth(**t) for t in prometheus_client.get_target_health()] if available else []
    return MonitoringStatus(
        available=available,
        targets=targets,
        grafana_url=settings.grafana_public_url,
        prometheus_url="http://localhost:9090",
    )
