import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from prometheus_fastapi_instrumentator import Instrumentator

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging_config import setup_logging
from app.core.minio_client import ensure_default_buckets
from app.core.openbao import bootstrap_secrets
from app.middleware.logging_middleware import logging_middleware

setup_logging()
logger = logging.getLogger("app.main")

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:
        created = ensure_default_buckets()
        if created:
            logger.info("Created MinIO buckets: %s", created)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to ensure default MinIO buckets at startup")

    try:
        bootstrap_secrets()
        logger.info("Bootstrapped control-plane secrets into OpenBao")
    except Exception:  # noqa: BLE001
        logger.exception("Failed to bootstrap secrets into OpenBao at startup")

    yield


app = FastAPI(
    title="OpenLakehouse Control Plane",
    description="FastAPI control plane for the OpenLakehouse platform.",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(logging_middleware)

app.include_router(api_router, prefix="/api/v1")

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

try:
    trace.set_tracer_provider(
        TracerProvider(resource=Resource.create({SERVICE_NAME: settings.otel_service_name}))
    )
    trace.get_tracer_provider().add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{settings.otel_exporter_otlp_endpoint}/v1/traces"))
    )
    FastAPIInstrumentor.instrument_app(app)
except Exception:  # noqa: BLE001
    logger.exception("Failed to initialize OpenTelemetry tracing")


@app.get("/api/v1")
def root() -> dict[str, str]:
    return {"name": "OpenLakehouse Control Plane", "version": "0.1.0"}
