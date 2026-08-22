# 09 — Incremental Models

**Content type: PROJECT IMPLEMENTATION.**

## Why every model so far has been a full-refresh `table`

**Verified from `dbt_project.yml`**: `+materialized: table` is set at the
folder level for staging/intermediate/marts — every `dbt run` fully
rebuilds every model, matching this project's static, one-time-extract
data (same reasoning as
[`04-silver-transformation/09-incremental-processing.md`](../04-silver-transformation/09-incremental-processing.md)).
This document builds one real `incremental` model anyway, to learn the
mechanism for when you eventually connect a genuinely growing source
(e.g. the Kafka streaming order feed from module 14).

## Hands-On Walkthrough — an incremental mart over the (already-incremental) Kafka stream

1. Create `models/marts/mart_olist_orders_incremental.sql`:
   ```sql
   {{
       config(
           materialized='incremental',
           unique_key='order_id'
       )
   }}
   select * from {{ ref('stg_olist_orders') }}
   {% if is_incremental() %}
   where order_purchase_ts > (select max(order_purchase_ts) from {{ this }})
   {% endif %}
   ```
2. Run it the first time: `docker compose exec dbt dbt run --select mart_olist_orders_incremental`.
   **Expected result**: dbt output shows a full initial build (the
   `is_incremental()` branch is false on the first run, because
   `{{ this }}` doesn't exist yet) — `99441` rows.
3. Run it again, unchanged: `docker compose exec dbt dbt run --select mart_olist_orders_incremental`.
   **Expected result**: dbt output now shows the `MERGE`/incremental path
   ran (check the compiled SQL in `target/run/.../mart_olist_orders_incremental.sql`
   to see the real `WHERE order_purchase_ts > ...` filter applied) — but
   since no new orders exist past the current max timestamp, `0` new
   rows are merged in. Row count stays `99441`.
4. Confirm no duplication happened:
   ```sql
   SELECT count(*) FROM iceberg.<schema>.mart_olist_orders_incremental;
   ```
   **Expected**: still `99441` — proves the incremental `MERGE` correctly
   found no new rows rather than blindly re-appending everything.

## The real risk this pattern has (cross-reference, not repeated here)

If this model's source ever contained multiple events for the same
`order_id` within one incremental batch (exactly the scenario your own
user memory documents as a real, previously-hit bug in this project's
Spark `MERGE INTO` code), the same class of bug applies to dbt
incremental models too — dedupe to one row per key *before* the
incremental `MERGE`, using the same `ROW_NUMBER()` pattern already used
in `stg_cdc_orders.sql`. Full treatment in
[`08-advanced-data-engineering/02-idempotency-and-semantics.md`](../08-advanced-data-engineering/02-idempotency-and-semantics.md).

> 🧪 **Checkpoint**: you ran the same incremental model twice, confirmed
> the second run used a real `WHERE` filter (not a full rebuild), and
> confirmed no row-count drift.

## Next document

[`10-documentation.md`](10-documentation.md).
