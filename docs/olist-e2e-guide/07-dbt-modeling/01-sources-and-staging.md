# 01 — Sources and Staging

## Hands-On Walkthrough

1. Define real sources in
   `infra/dbt/dbt_project/models/staging/_olist_sources.yml`:
   ```yaml
   sources:
     - name: bronze
       schema: bronze
       tables: [{name: olist_orders}, {name: olist_customers}]
   ```
2. Build `stg_olist_orders.sql`:
   ```sql
   SELECT order_id, customer_id,
          CAST(order_purchase_timestamp AS timestamp) AS order_purchase_timestamp,
          order_status
   FROM {{ source('bronze', 'olist_orders') }}
   ```
3. Run it:
   ```powershell
   docker compose exec dbt dbt run --select stg_olist_orders --project-dir dbt_project --profiles-dir profiles
   ```
   **Expected result**: real success, `99441` rows in the resulting
   table.

## Why sources (not hardcoded table names) matter

| Approach | What happens if `bronze.olist_orders` moves/renames |
|---|---|
| Hardcoded `FROM iceberg.bronze.olist_orders` | every model referencing it breaks silently until run |
| `{{ source('bronze', 'olist_orders') }}` | one YAML edit fixes every dependent model; `dbt source freshness` and lineage docs also work automatically |

> 🧪 **Checkpoint**: `stg_olist_orders` built successfully with exactly
> `99441` rows.

## Next document

[`02-intermediate-models-and-joins.md`](02-intermediate-models-and-joins.md).
