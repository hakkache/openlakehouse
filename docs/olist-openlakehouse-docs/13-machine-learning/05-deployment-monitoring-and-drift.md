# 05 — Deployment, Monitoring, and Drift

**Content type: PROJECT IMPLEMENTATION + PROPOSED EXTENSION** (real batch
scoring today; real-time serving/drift-monitoring is a documented
extension, not built in this repo).

## Hands-On Walkthrough — real batch scoring using the registered model

1. In Jupyter, load the `Production`-staged model from doc 04 and score
   new orders:
   ```python
   import mlflow.sklearn, pandas as pd
   model = mlflow.sklearn.load_model("models:/late_delivery_model/Production")
   new_orders = spark.sql("SELECT * FROM iceberg.dbt_marts.mart_late_delivery_features LIMIT 20").toPandas()
   preds = model.predict(new_orders.drop(columns=["order_id", "is_late"]))
   new_orders["predicted_late"] = preds
   print(new_orders[["order_id", "is_late", "predicted_late"]])
   ```
2. **Expected result**: a real prediction column, directly comparable
   row-by-row against the true `is_late` label for these 20 already-known
   orders — a sanity check before trusting the model on genuinely unseen
   future orders.
3. Write predictions back to a real Gold table for BI consumption
   (connects to module 12):
   ```python
   spark.createDataFrame(new_orders).writeTo("catalog.gold.late_delivery_predictions").createOrReplace()
   ```
4. Build a Superset chart on this new table (per module 12's own
   patterns) comparing `predicted_late` vs. real `is_late` counts — a
   genuine model-monitoring view a real ops team would want.

## The honest gap: no automated drift detection today

**PROPOSED EXTENSION**: a real production deployment would re-run step 1
on a schedule (via Dagster, module 09 — a new `score_orders_job` op
calling this same scoring logic) and track prediction-vs-actual accuracy
over time in a dedicated `model_performance_log` table, alerting (via
module 15's Grafana) if accuracy degrades — none of this scheduled/
automated monitoring exists in this repo today; this document only
establishes the real, working, manual scoring mechanism it would build on.

> 🧪 **Checkpoint for the module**: you loaded your own registered
> `Production`-stage model, scored real orders, and wrote predictions to
> a real Gold table you can inspect in Superset — and can explain
> precisely what automated monitoring is still missing.

## Next module

[`14-streaming-and-cdc/01-streaming-architecture.md`](../14-streaming-and-cdc/01-streaming-architecture.md).
