# 04 — Staging Models

**Content type: PROJECT IMPLEMENTATION.**

## What belongs in staging (recap from the existing project convention)

**Verified precedent in this exact repo**: `stg_cdc_orders.sql`/
`stg_kafka_orders.sql` already show the established pattern — 1:1 with a
source table, light renaming/casting, and (per repo memory) the right
place to absorb raw-layer duplicates via `ROW_NUMBER()` dedup. Staging
models here are dbt's equivalent of what the Pipeline Builder's Silver
layer already did in module 04 — you are about to build the *dbt* version
of the same idea, which is normal: this project uses **both** the
Pipeline Builder and dbt for transformation, and module 06's models can
read directly from Bronze (skipping the Pipeline Builder's Silver
tables entirely) to keep the two transformation paths independent and
comparable.

## Hands-On Walkthrough — `stg_olist_orders.sql`

1. Via the `/dbt` UI's create-file action, create
   `models/staging/stg_olist_orders.sql`:
   ```sql
   with source as (
       select * from {{ source('bronze', 'olist_orders') }}
   )
   select
       order_id,
       customer_id,
       order_status,
       cast(order_purchase_timestamp as timestamp) as order_purchase_ts,
       cast(order_approved_at as timestamp) as order_approved_ts,
       cast(order_delivered_customer_date as timestamp) as order_delivered_ts,
       cast(order_estimated_delivery_date as timestamp) as order_estimated_delivery_ts
   from source
   ```
2. Run it:
   ```powershell
   docker compose exec dbt dbt run --select stg_olist_orders
   ```
3. **Expected result**: real dbt output — `1 of 1 OK created sql table
   model ... [CREATE TABLE ...]` and a real elapsed time.
4. Verify in **SQL Editor**:
   ```sql
   SELECT count(*) FROM iceberg.<your dbt target schema>.stg_olist_orders;
   ```
   (check your `profiles/profiles.yml`/`dbt_project.yml` for the exact
   configured target schema name — this project's custom
   `get_custom_schema.sql` macro controls it, see the gotcha below).
   **Expected result**: `99441`.

## Gotcha: dbt's default schema-naming behavior is overridden here

**Verified from repo history**: this project already overrides
`generate_schema_name` via `macros/get_custom_schema.sql` because dbt's
*default* behavior concatenates your configured target schema with any
per-model `+schema` config (e.g. `analytics_staging` instead of just
`staging`) — check that macro's content if a model's table shows up in
an unexpected schema name.

> 🧪 **Checkpoint**: `stg_olist_orders` exists as a real table with
> `99441` rows and 4 correctly-cast timestamp columns.

## Next document

[`05-intermediate-models.md`](05-intermediate-models.md).
