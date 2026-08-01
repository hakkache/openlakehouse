from fastapi import APIRouter, Depends

from app.core.compute_client import get_jupyter_status, get_spark_status, get_trino_status
from app.core.security import CurrentUser, get_current_user
from app.schemas.compute import ComputeStatus, JupyterStatus, SparkStatus, TrinoComputeStatus

router = APIRouter(prefix="/compute", tags=["compute"])


@router.get("/status", response_model=ComputeStatus)
def get_compute_status(user: CurrentUser = Depends(get_current_user)) -> ComputeStatus:
    """Real status/CPU/memory/workers/jobs for Spark, Trino and Jupyter (no simulated data).

    Flink is intentionally not included - it is out of scope for this deployment
    (see docs/IMPLEMENTATION_STATUS.md Phase 11 notes).
    """
    spark = get_spark_status()
    trino = get_trino_status()
    jupyter = get_jupyter_status()
    return ComputeStatus(
        spark=SparkStatus(**spark) if spark else None,
        trino=TrinoComputeStatus(**trino) if trino else None,
        jupyter=JupyterStatus(**jupyter) if jupyter else None,
    )
