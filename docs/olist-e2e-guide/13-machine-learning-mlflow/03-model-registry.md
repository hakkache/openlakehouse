# 03 — Model Registry and Staging

## Scenario 3 (Medium→Complex) — model registry and staging

1. Register your winning run's model as `olist-late-delivery-predictor`.
   Transition it `None → Staging`.
2. Load it back for real inference:
   ```python
   model = mlflow.sklearn.load_model("models:/olist-late-delivery-predictor/Staging")
   preds = model.predict(new_orders_df)
   ```
   **Expected result**: real predictions on held-out real Olist rows.

## Registry stage lifecycle

| Stage | Meaning |
|---|---|
| `None` | just registered, not yet promoted |
| `Staging` | candidate for production, being validated |
| `Production` | actively served (not exercised in this guide, but the same API applies: `models:/name/Production`) |
| `Archived` | retired |

> 🧪 **Checkpoint**: 1 model registered and promoted to `Staging`, loaded
> back and used for real predictions on held-out data.

## Next document

[`04-closing-the-loop.md`](04-closing-the-loop.md).
