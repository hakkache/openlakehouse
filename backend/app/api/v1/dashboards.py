from fastapi import APIRouter, Depends

from app.core import superset_client
from app.core.security import CurrentUser, get_current_user
from app.schemas.dashboards import DashboardInfo, DashboardsStatus

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get("/status", response_model=DashboardsStatus)
def get_dashboards_status(user: CurrentUser = Depends(get_current_user)) -> DashboardsStatus:
    """Real Superset dashboard list (no simulated data)."""
    dashboards = superset_client.list_dashboards()
    return DashboardsStatus(
        available=bool(dashboards) or superset_client.is_available(),
        dashboards=[DashboardInfo(**d) for d in dashboards],
    )
