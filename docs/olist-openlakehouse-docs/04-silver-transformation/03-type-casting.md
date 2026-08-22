# 03 — Type Casting

**Content type: PROJECT IMPLEMENTATION.**

## Why this is needed (recap)

[`03-bronze-ingestion/03-schema-inference.md`](../03-bronze-ingestion/03-schema-inference.md)
showed `customer_zip_code_prefix` inferred as `integer` in Bronze — wrong
for an identifier column. This document fixes it for real, using the
Pipeline Builder's `cast` node.

## Hands-On Walkthrough — cast `olist_customers`

1. Create a new pipeline `silver_customers`.
2. **Source node**: `schema = bronze`, `table = olist_customers`.
3. Add a **cast** transform node with `casts`:
   ```json
   { "customer_zip_code_prefix": "varchar" }
   ```
   and `keep`: `customer_id, customer_unique_id, customer_city, customer_state`.
4. Click **Compile**. **Expected result**:
   ```sql
   SELECT CAST(customer_zip_code_prefix AS varchar) AS customer_zip_code_prefix,
          customer_id, customer_unique_id, customer_city, customer_state
   FROM <predecessor>
   ```
5. Add a **destination** node: type `iceberg_silver`, `table = olist_customers`.
6. Click **Run** (or **Save & Run**, depending on your Pipeline Builder
   version). Wait for the run status to reach `SUCCESS` on the Pipelines
   page's run history.
7. Verify in **SQL Editor**:
   ```sql
   DESCRIBE iceberg.silver.olist_customers;
   ```
   **Expected result**: `customer_zip_code_prefix` is now `varchar`.
   ```sql
   SELECT count(*) FROM iceberg.silver.olist_customers;
   ```
   **Expected result**: `99441` — same row count as Bronze, confirming the
   cast changed the type without dropping/duplicating any rows.

## Complete `silver_orders` from the previous document

8. Go back to `silver_orders` (from
   [`02-data-cleaning.md`](02-data-cleaning.md)). Add a **cast** node after
   `rename`, casting `purchase_ts`, `order_approved_at`,
   `order_delivered_customer_date`, `order_estimated_delivery_date` all to
   `timestamp` (they're already inferred as `timestamp` in Bronze — this
   cast is intentionally a no-op here, demonstrating that casting an
   already-correct type is always safe, unlike skipping the cast and
   *assuming* it's correct).
9. Add a destination node `iceberg_silver` / `olist_orders`, run it, and
   confirm via SQL Editor:
   ```sql
   SELECT count(*) FROM iceberg.silver.olist_orders;
   ```
   **Expected**: `99441`.

> 🧪 **Checkpoint**: `iceberg.silver.olist_customers.customer_zip_code_prefix`
> is `varchar`, and both new Silver tables have the same row counts as
> their Bronze sources — proving casting alone doesn't lose data.

## Next document

[`04-deduplication.md`](04-deduplication.md).
