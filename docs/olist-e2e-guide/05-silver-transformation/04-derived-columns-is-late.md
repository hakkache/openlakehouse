# 04 — Derived Columns: Building `is_late`

## Scenario 4 (Complex) — a real business-rule column

1. On `silver_orders` (doc 01), add a **derived_column** node computing
   `is_late`:
   ```sql
   CASE
     WHEN order_delivered_customer_date IS NULL THEN NULL
     WHEN order_delivered_customer_date > order_estimated_delivery_date THEN true
     ELSE false
   END
   ```
2. Re-run, then check the real distribution:
   ```sql
   SELECT is_late, count(*) FROM iceberg.silver.olist_orders GROUP BY is_late;
   ```
   **Expected result**: 3 groups (`true`, `false`, `NULL` for
   undelivered orders) with real counts.

## Why this column matters for the rest of the guide

`is_late` becomes the foundational late-delivery metric reused in:

| Module | How `is_late` is used |
|---|---|
| 08 (dimensional modeling) | joined into `fact_orders` |
| 12 (Superset) | a dashboard KPI (late-delivery rate) |
| 13 (MLflow) | the target label for the ML model |
| 20 (capstone) | part of the full end-to-end run |

> 🧪 **Checkpoint**: `is_late` exists with a verified 3-group real
> distribution (`true`/`false`/`NULL`), and you can name at least 2
> later modules that will reuse it.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../06-pipeline-builder-deep-dive/00-index.md`](../06-pipeline-builder-deep-dive/00-index.md)
for the full node-by-node deep dive.
