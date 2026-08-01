import logging
from functools import lru_cache

import hvac

from app.core.config import get_settings

logger = logging.getLogger(__name__)

SECRET_PATH = "openlakehouse/backend"


@lru_cache
def get_openbao_client() -> hvac.Client:
    settings = get_settings()
    return hvac.Client(url=settings.openbao_addr, token=settings.openbao_token)


def bootstrap_secrets() -> None:
    """Write current control-plane secrets into OpenBao so they are centrally managed."""
    settings = get_settings()
    client = get_openbao_client()
    client.secrets.kv.v2.create_or_update_secret(
        path=SECRET_PATH,
        secret={
            "postgres_password": settings.postgres_password,
            "minio_root_password": settings.minio_root_password,
            "backend_secret_key": settings.backend_secret_key,
        },
    )


def read_secret() -> dict:
    client = get_openbao_client()
    response = client.secrets.kv.v2.read_secret_version(path=SECRET_PATH, raise_on_deleted_version=True)
    return response["data"]["data"]


def check_openbao_reachable() -> bool:
    try:
        client = get_openbao_client()
        return client.sys.is_initialized() and not client.sys.is_sealed()
    except Exception:  # noqa: BLE001
        return False
