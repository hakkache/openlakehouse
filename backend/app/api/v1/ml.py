from fastapi import APIRouter, Depends

from app.core import mlflow_client
from app.core.security import CurrentUser, get_current_user
from app.schemas.ml import MLExperiment, MLModelVersion, MLRegisteredModel, MLRun, MLStatus

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/status", response_model=MLStatus)
def get_ml_status(user: CurrentUser = Depends(get_current_user)) -> MLStatus:
    """Real MLflow experiments + registered models (no simulated data)."""
    if not mlflow_client.is_available():
        return MLStatus(available=False, experiments=[], registered_models=[])

    experiments = [
        MLExperiment(
            experiment_id=e["experiment_id"],
            name=e["name"],
            lifecycle_stage=e.get("lifecycle_stage", "active"),
            artifact_location=e.get("artifact_location", ""),
        )
        for e in mlflow_client.list_experiments()
    ]
    models = [
        MLRegisteredModel(
            name=m["name"],
            latest_versions=[
                MLModelVersion(
                    version=v.get("version", ""),
                    status=v.get("status", ""),
                    current_stage=v.get("current_stage", ""),
                    run_id=v.get("run_id"),
                )
                for v in m.get("latest_versions", [])
            ],
        )
        for m in mlflow_client.list_registered_models()
    ]
    return MLStatus(available=True, experiments=experiments, registered_models=models)


@router.get("/experiments/{experiment_id}/runs", response_model=list[MLRun])
def get_experiment_runs(experiment_id: str, user: CurrentUser = Depends(get_current_user)) -> list[MLRun]:
    runs = mlflow_client.list_runs([experiment_id])
    result = []
    for r in runs:
        info = r.get("info", {})
        data = r.get("data", {})
        result.append(
            MLRun(
                run_id=info.get("run_id", ""),
                experiment_id=info.get("experiment_id", ""),
                status=info.get("status", ""),
                start_time=info.get("start_time"),
                end_time=info.get("end_time"),
                params={p["key"]: p["value"] for p in data.get("params", [])},
                metrics={m["key"]: m["value"] for m in data.get("metrics", [])},
            )
        )
    return result
