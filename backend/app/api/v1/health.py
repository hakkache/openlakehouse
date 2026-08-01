import logging

from fastapi import APIRouter
from sqlalchemy import text

from app.core.database import engine
from app.core.keycloak import check_keycloak_reachable
from app.core.minio_client import get_minio_client
from app.core.openbao import check_openbao_reachable
from app.core.redis_client import get_redis
from app.schemas.health import DependencyStatus, HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    dependencies: list[DependencyStatus] = []
    overall = "healthy"

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        dependencies.append(DependencyStatus(name="postgres", status="healthy"))
    except Exception as exc:  # noqa: BLE001
        logger.exception("postgres health check failed")
        dependencies.append(DependencyStatus(name="postgres", status="unhealthy", detail=str(exc)))
        overall = "degraded"

    try:
        get_redis().ping()
        dependencies.append(DependencyStatus(name="redis", status="healthy"))
    except Exception as exc:  # noqa: BLE001
        logger.exception("redis health check failed")
        dependencies.append(DependencyStatus(name="redis", status="unhealthy", detail=str(exc)))
        overall = "degraded"

    try:
        buckets = get_minio_client().list_buckets()
        dependencies.append(DependencyStatus(name="minio", status="healthy", detail=f"{len(buckets)} buckets"))
    except Exception as exc:  # noqa: BLE001
        logger.exception("minio health check failed")
        dependencies.append(DependencyStatus(name="minio", status="unhealthy", detail=str(exc)))
        overall = "degraded"

    if check_keycloak_reachable():
        dependencies.append(DependencyStatus(name="keycloak", status="healthy", detail="JWKS reachable"))
    else:
        dependencies.append(DependencyStatus(name="keycloak", status="unhealthy"))
        overall = "degraded"

    if check_openbao_reachable():
        dependencies.append(DependencyStatus(name="openbao", status="healthy", detail="unsealed"))
    else:
        dependencies.append(DependencyStatus(name="openbao", status="unhealthy"))
        overall = "degraded"

    return HealthResponse(status=overall, dependencies=dependencies)


@router.get("/ready")
def ready() -> dict[str, str]:
    return {"status": "ready"}
