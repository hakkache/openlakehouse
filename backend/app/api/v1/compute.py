from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.audit import record_audit
from app.core.compute_client import (
    get_jupyter_kernels,
    get_jupyter_status,
    get_spark_applications,
    get_spark_status,
    get_trino_queries,
    get_trino_status,
    kill_jupyter_kernel,
    kill_spark_application,
    kill_trino_query,
)
from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user, require_roles
from app.schemas.compute import (
    ComputeStatus,
    JupyterKernel,
    JupyterStatus,
    SparkApplication,
    SparkStatus,
    TrinoComputeStatus,
    TrinoQuery,
)

router = APIRouter(prefix="/compute", tags=["compute"])

CAN_MANAGE_COMPUTE = require_roles("ADMIN", "DATA_ENGINEER")


@router.get("/status", response_model=ComputeStatus)
def get_compute_status(user: CurrentUser = Depends(get_current_user)) -> ComputeStatus:
    """Real status/CPU/memory/workers/jobs for Spark, Trino and Jupyter (no simulated data),
    plus the detailed, killable process list for each engine.

    Flink is intentionally not included - it is out of scope for this deployment
    (see docs/IMPLEMENTATION_STATUS.md Phase 11 notes).
    """
    spark = get_spark_status()
    trino = get_trino_status()
    jupyter = get_jupyter_status()
    spark_apps = get_spark_applications() or []
    trino_queries = get_trino_queries() or []
    jupyter_kernels = get_jupyter_kernels() or []
    return ComputeStatus(
        spark=SparkStatus(**spark) if spark else None,
        trino=TrinoComputeStatus(**trino) if trino else None,
        jupyter=JupyterStatus(**jupyter) if jupyter else None,
        spark_applications=[SparkApplication(**a) for a in spark_apps],
        trino_queries=[TrinoQuery(**q) for q in trino_queries],
        jupyter_kernels=[JupyterKernel(**k) for k in jupyter_kernels],
    )


@router.post("/spark/applications/{app_id}/kill", status_code=204)
def kill_spark_app(
    app_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(CAN_MANAGE_COMPUTE),
) -> None:
    ok = kill_spark_application(app_id)
    record_audit(
        db,
        action="SPARK_APPLICATION_KILLED",
        resource="spark_application",
        resource_id=app_id,
        status="SUCCESS" if ok else "FAILURE",
        request=request,
        user_id=user.subject,
    )
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to kill the Spark application")


@router.post("/trino/queries/{query_id}/kill", status_code=204)
def kill_trino_query_endpoint(
    query_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(CAN_MANAGE_COMPUTE),
) -> None:
    ok = kill_trino_query(query_id)
    record_audit(
        db,
        action="TRINO_QUERY_KILLED",
        resource="trino_query",
        resource_id=query_id,
        status="SUCCESS" if ok else "FAILURE",
        request=request,
        user_id=user.subject,
    )
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to kill the Trino query")


@router.post("/jupyter/kernels/{kernel_id}/kill", status_code=204)
def kill_jupyter_kernel_endpoint(
    kernel_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(CAN_MANAGE_COMPUTE),
) -> None:
    ok = kill_jupyter_kernel(kernel_id)
    record_audit(
        db,
        action="JUPYTER_KERNEL_KILLED",
        resource="jupyter_kernel",
        resource_id=kernel_id,
        status="SUCCESS" if ok else "FAILURE",
        request=request,
        user_id=user.subject,
    )
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to kill the Jupyter kernel")
