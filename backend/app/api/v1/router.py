from fastapi import APIRouter

from app.api.v1 import (
    admin,
    assistant,
    auth,
    catalog,
    compute,
    connections,
    dashboards,
    git,
    health,
    jobs,
    ml,
    monitoring,
    pipelines,
    sql,
    streaming,
    workspaces,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(workspaces.router)
api_router.include_router(sql.router)
api_router.include_router(pipelines.router)
api_router.include_router(streaming.router)
api_router.include_router(assistant.router)
api_router.include_router(compute.router)
api_router.include_router(catalog.router)
api_router.include_router(ml.router)
api_router.include_router(git.router)
api_router.include_router(dashboards.router)
api_router.include_router(monitoring.router)
api_router.include_router(jobs.router)
api_router.include_router(admin.router)
api_router.include_router(connections.router)

