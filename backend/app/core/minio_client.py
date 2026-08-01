from functools import lru_cache

from minio import Minio

from app.core.config import get_settings

DEFAULT_BUCKETS = [
    "bronze",
    "silver",
    "gold",
    "artifacts",
    "models",
    "checkpoints",
    "uploads",
    "lakehouse",
]


@lru_cache
def get_minio_client() -> Minio:
    settings = get_settings()
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=False,
    )


def ensure_default_buckets() -> list[str]:
    client = get_minio_client()
    created = []
    for bucket in DEFAULT_BUCKETS:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
            created.append(bucket)
    return created
