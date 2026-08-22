# 04 — MLflow Tracking and Registry

**Content type: CURRENT PLATFORM CAPABILITY (verified, real MLflow deployment).**

## Hands-On Walkthrough — inspect your real run in the MLflow UI

1. Open MLflow's UI directly: `http://localhost:5000` (same direct-
   access pattern as Dagster/Jupyter/Superset).
2. Click **Experiments** → `late_delivery_prediction`. **Expected
   result**: your real run from doc 03, `logistic_regression_late_delivery`,
   with real logged params (`class_weight=balanced`) and metrics
   (`accuracy`, `precision`, `recall`, `f1_score`) — confirm these exactly
   match what was printed to your terminal in doc 03.
3. Click into the run, **Artifacts** tab. **Expected result**: a real
   `model/` artifact directory containing the serialized sklearn pipeline
   — MLflow genuinely persisted the trained model object, not just
   metrics text.
4. Go to **Models** (registry) → `late_delivery_model`. **Expected
   result**: version `1` registered, pointing back to your real run ID.
5. Compare against the existing `customer_churn_model` registry entry
   (from the pre-existing `train_churn.py`) — confirm both models coexist
   independently in the same registry, each with their own version
   history.

## Promote the model to a stage (real registry feature)

6. On `late_delivery_model` version 1, click **Stage** → **Transition to
   Production**. **Expected result**: the model is now queryable by
   stage alias, e.g. via
   `mlflow.sklearn.load_model("models:/late_delivery_model/Production")`
   — the real mechanism a serving system would use to always fetch "the
   current production model" without hardcoding a version number.

> 🧪 **Checkpoint**: you found your own real run's logged params/metrics/
> artifacts in the MLflow UI, and promoted your model to the
> `Production` stage in the real registry.

## Next document

[`05-deployment-monitoring-and-drift.md`](05-deployment-monitoring-and-drift.md).
