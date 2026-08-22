# Module 13 — Machine Learning with MLflow

**Content type: CURRENT PLATFORM CAPABILITY + PROJECT WORK.** Real
pattern per `infra/mlflow/train_churn.py`: Trino → pandas → scikit-learn
→ MLflow tracking, `MLFLOW_TRACKING_URI=http://mlflow:5000`.

## Document map

| # | Document | Covers |
|---|---|---|
| 01 | [`01-first-training-run.md`](01-first-training-run.md) | Reproducing the reference Trino→pandas→sklearn→MLflow pattern |
| 02 | [`02-comparing-runs.md`](02-comparing-runs.md) | Comparing 3 model variants in one experiment |
| 03 | [`03-model-registry.md`](03-model-registry.md) | Registering and loading a `Staging` model |
| 04 | [`04-closing-the-loop.md`](04-closing-the-loop.md) | Writing predictions back to the lakehouse, and a real failed run |

## Next document

[`01-first-training-run.md`](01-first-training-run.md).
