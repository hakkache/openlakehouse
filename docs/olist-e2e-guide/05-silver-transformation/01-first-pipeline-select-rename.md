# 01 — Your First Real Pipeline: silver_orders

## Real verified node-type inventory (quick reference — full detail in module 06)

| Category | Real compiled types |
|---|---|
| Source | only `iceberg_table` (others UI-only, raise `CompileError`) |
| Transform | select, rename, filter, join, union, aggregate, sort, deduplicate, cast, fill_null, replace, derived_column, window, pivot, unpivot |
| Quality | not_null, unique, range, regex, freshness, row_count (`schema` type is UI-only, always errors) |
| Destination | only iceberg_bronze/iceberg_silver/iceberg_gold (minio/postgresql/kafka are UI-only) |

## Hands-On Walkthrough — Scenario 1 (Simple)

1. Open **Pipelines** → **New Pipeline**, name it `silver_orders`.
2. Add a **source** node: `type=iceberg_table`, `schema=bronze`,
   `table=olist_orders`.
3. Add a **select** node keeping only real needed columns; a **rename**
   node if any column names need cleanup.
4. Add a **destination** node: `type=iceberg_silver`,
   `table=olist_orders`.
5. Click **Compile**, inspect the generated SQL (this pipeline has no
   `variable`/`code`/`control` nodes, so it stays in `mode: "sql"` — a
   single compiled `WITH` CTE statement, per module 06 doc 01). Click
   **Run**.
6. Verify: `SELECT count(*) FROM iceberg.silver.olist_orders;` **Expected
   result**: `99441` — unchanged row count, since this pass only
   selects/renames.

| Node | Type | Config |
|---|---|---|
| 1 | `source` / `iceberg_table` | `schema=bronze`, `table=olist_orders` |
| 2 | `transform` / `select` | `columns=[order_id, customer_id, order_status, order_purchase_timestamp, order_delivered_customer_date, order_estimated_delivery_date]` |
| 3 | `transform` / `rename` | `mapping={order_purchase_timestamp: purchased_at}` |
| 4 | `destination` / `iceberg_silver` | `table=olist_orders` |

> 🧪 **Checkpoint**: `silver_orders` runs successfully, `mode: sql`
> confirmed via the compile response, and row count exactly `99441`.

## Next document

[`02-casting-and-quality-gates.md`](02-casting-and-quality-gates.md).
