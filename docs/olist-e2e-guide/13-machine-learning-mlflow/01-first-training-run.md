# 01 — First Training Run

## Hands-On Walkthrough — reproduce the reference training pattern

1. Open Jupyter, connect to Trino via the `trino` python client or JDBC,
   pull `iceberg.gold.fact_orders` joined with `dim_customers` into a
   pandas DataFrame.
2. ```python
   import mlflow
   mlflow.set_tracking_uri("http://mlflow:5000")
   mlflow.set_experiment("olist-late-delivery")
   ```
3. Train a baseline `LogisticRegression` predicting `is_late` (module 05
   doc 04's derived column) from `price`, `freight_value`, `order_month`.
   Log params/metrics/model with `mlflow.sklearn.log_model(...)`.
4. Open MLflow's UI (`http://localhost:5000`). **Expected result**: a
   real run with logged accuracy/F1, and a registered artifact.

| Step | What's logged |
|---|---|
| `mlflow.log_param(...)` | model hyperparameters |
| `mlflow.log_metric(...)` | accuracy, F1, AUC |
| `mlflow.sklearn.log_model(...)` | the trained model artifact itself |

> 🧪 **Checkpoint**: 1 real run visible in MLflow's UI, with real logged
> params/metrics/model artifact.

## Next document

[`02-comparing-runs.md`](02-comparing-runs.md).
