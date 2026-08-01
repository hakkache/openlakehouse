import os

SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY", "openlakehouse_dev_superset_secret_key")

POSTGRES_HOST = os.environ.get("POSTGRES_HOST", "postgres")
POSTGRES_PORT = os.environ.get("POSTGRES_PORT", "5432")
POSTGRES_USER = os.environ.get("POSTGRES_USER", "openlakehouse")
POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", "openlakehouse_dev_password")
SUPERSET_METADATA_DB = os.environ.get("SUPERSET_METADATA_DB", "superset")

SQLALCHEMY_DATABASE_URI = (
    f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{SUPERSET_METADATA_DB}"
)

REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = os.environ.get("REDIS_PORT", "6379")

CACHE_CONFIG = {
    "CACHE_TYPE": "RedisCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
    "CACHE_KEY_PREFIX": "superset_",
    "CACHE_REDIS_HOST": REDIS_HOST,
    "CACHE_REDIS_PORT": int(REDIS_PORT),
    "CACHE_REDIS_DB": 2,
}
DATA_CACHE_CONFIG = CACHE_CONFIG

FEATURE_FLAGS = {
    "ALERT_REPORTS": False,
    "DASHBOARD_NATIVE_FILTERS": True,
}

WTF_CSRF_ENABLED = True
WTF_CSRF_EXEMPT_LIST = []

ENABLE_PROXY_FIX = True
