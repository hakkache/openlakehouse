from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    backend_env: str = "development"
    backend_secret_key: str = "change_me_dev_secret_key"
    backend_log_level: str = "INFO"
    backend_cors_origins: str = "http://localhost"

    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_db: str = "openlakehouse"
    postgres_user: str = "openlakehouse"
    postgres_password: str = "openlakehouse_dev_password"

    redis_host: str = "redis"
    redis_port: int = 6379
    redis_password: str = ""

    minio_endpoint: str = "minio:9000"
    minio_root_user: str = "minioadmin"
    minio_root_password: str = "minioadmin123"

    keycloak_internal_url: str = "http://keycloak:8080"
    keycloak_public_url: str = "http://localhost:8081"
    keycloak_realm: str = "openlakehouse"
    keycloak_client_id: str = "openlakehouse-web"

    openbao_addr: str = "http://openbao:8200"
    openbao_token: str = "dev-root-token"

    trino_host: str = "trino"
    trino_port: int = 8080
    trino_catalog: str = "iceberg"

    kafka_bootstrap_servers: str = "kafka:9092"

    otel_exporter_otlp_endpoint: str = "http://otel-collector:4318"
    otel_service_name: str = "openlakehouse-backend"

    ollama_url: str = "http://ollama:11434"
    ollama_model: str = "llama3.2:1b"

    spark_master_url: str = "http://spark-master:8080"
    jupyter_url: str = "http://jupyter:8888"
    jupyter_token: str = "openlakehouse"

    mlflow_url: str = "http://mlflow:5000"

    gitea_url: str = "http://gitea:3000"
    gitea_admin_user: str = "olh-admin"
    gitea_admin_password: str = "openlakehouse_dev_password"

    superset_url: str = "http://superset:8088"
    superset_admin_user: str = "admin"
    superset_admin_password: str = "openlakehouse_dev_password"
    superset_public_url: str = "http://localhost:8088"

    prometheus_url: str = "http://prometheus:9090"
    grafana_public_url: str = "http://localhost:3300"

    dagster_url: str = "http://dagster-webserver:3000"
    dagster_public_url: str = "http://localhost:3001"

    keycloak_admin_user: str = "admin"
    keycloak_admin_password: str = "admin_dev_password"

    connection_encryption_key: str = ""

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.backend_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
