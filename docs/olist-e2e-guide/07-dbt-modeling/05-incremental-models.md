# 05 — Incremental Models

## Scenario 5 (Complex) — incremental models

1. Build `mart_olist_orders_incremental.sql` using `is_incremental()`:
   ```sql
   {{ config(materialized='incremental', unique_key='order_id') }}
   SELECT * FROM {{ ref('stg_olist_orders') }}
   {% if is_incremental() %}
   WHERE order_purchase_timestamp > (SELECT max(order_purchase_timestamp) FROM {{ this }})
   {% endif %}
   ```
2. Run twice in a row, recording the real row counts each time:

| Run | Command | Expected rows processed |
|---|---|---|
| 1st (full) | `dbt run --select mart_olist_orders_incremental` | `99441` |
| 2nd (incremental) | same command, immediately after | `0` new rows merged |

3. **Expected result**: 1st run = full `99441`; 2nd identical run = `0`
   new rows merged (real MERGE-path incremental behavior) — this
   idempotency is the entire point of incremental models: safe to
   re-run on a schedule without reprocessing everything.

## Why this differs from a naive full-refresh model

| Materialization | Every run cost | Safe to run hourly on a huge table? |
|---|---|---|
| `table` (full refresh) | reprocesses everything | expensive at scale |
| `incremental` | only processes new/changed rows | yes — this is the point |

> 🧪 **Checkpoint**: confirmed the 2nd run genuinely processed `0` new
> rows — proving real, working incremental idempotency, not just a
> config flag that does nothing.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../08-dimensional-modeling-and-scd2/00-index.md`](../08-dimensional-modeling-and-scd2/00-index.md).
