import trino.dbapi

from app.core.config import get_settings


def get_trino_connection(user: str = "openlakehouse") -> trino.dbapi.Connection:
    settings = get_settings()
    return trino.dbapi.connect(
        host=settings.trino_host,
        port=settings.trino_port,
        user=user or "openlakehouse",
        catalog=settings.trino_catalog,
    )
