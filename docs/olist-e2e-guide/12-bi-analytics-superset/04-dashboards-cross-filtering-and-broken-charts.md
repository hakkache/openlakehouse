# 04 — Dashboards, Cross-Filtering, and Broken Charts

## Scenario 5 (Complex) — a full dashboard with cross-filtering

1. Assemble a dashboard: the revenue trend, top-10-states bar, late-
   delivery KPI, and a seller leaderboard chart (using the SCD2
   `dim_sellers_scd2` current rows from module 08). Enable
   **cross-filtering**: click a state bar, confirm the other charts
   filter accordingly. **Expected result**: real client-side filter
   propagation across all 4 charts.

## Scenario 6 (Complex) — a broken chart and root-causing it

2. Rename a column in the underlying `mart_olist_order_summary` dbt
   model (module 07), rerun dbt, refresh the dashboard. **Expected
   result**: the affected chart errors with a real "column not found"
   message. Fix by refreshing the dataset's column metadata in Superset
   (**Edit dataset** → **Sync columns**).

## Root-cause checklist (reusable for any future broken chart)

| Symptom | Likely cause | Fix |
|---|---|---|
| "Column not found" error | Underlying model's schema changed | **Edit dataset** → **Sync columns** |
| Chart shows stale numbers | Superset's own cache | Force refresh / clear cache |
| Chart shows `0`/empty unexpectedly | Upstream table genuinely empty (check via Trino directly first) | Rebuild the upstream pipeline/model |

> 🧪 **Checkpoint**: a working 4-chart dashboard with real cross-
> filtering, and one real broken-chart scenario root-caused and fixed
> using the checklist above.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../13-machine-learning-mlflow/00-index.md`](../13-machine-learning-mlflow/00-index.md).
