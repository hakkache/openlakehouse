# 02 — Data Cleaning

**Content type: PROJECT IMPLEMENTATION.**

## What "cleaning" means for `olist_orders`

Before any typing/dedup/quality-gate work (the next few documents), decide
*which columns you actually need downstream* — Silver is also where you
trim a wide Bronze table down to what Gold will use, via `select`/`rename`
nodes.

## Hands-On Walkthrough — build the first real Silver pipeline

1. In `http://localhost/pipelines`, open `silver_orders_preview` (from the
   previous document) or create a new pipeline `silver_orders`.
2. **Source node**: `schema = bronze`, `table = olist_orders`.
3. Add a **select** transform node, connected after the source, with
   `columns`:
   ```
   order_id, customer_id, order_status, order_purchase_timestamp,
   order_approved_at, order_delivered_customer_date,
   order_estimated_delivery_date
   ```
   (drops the `order_delivered_carrier_date` column for this exercise —
   deliberately, to observe the compiled SQL change).
4. Click **Compile**. **Expected result**:
   ```sql
   WITH src AS (SELECT * FROM iceberg.bronze.olist_orders),
   sel AS (SELECT order_id, customer_id, order_status, order_purchase_timestamp,
                  order_approved_at, order_delivered_customer_date,
                  order_estimated_delivery_date FROM src)
   SELECT * FROM sel
   ```
   (exact CTE names may differ; the column list is what matters).
5. Add a **rename** transform node after `select`, with `mapping`:
   `{"order_purchase_timestamp": "purchase_ts"}`. Compile again.
   **Expected result**: the final `SELECT` now aliases that one column to
   `purchase_ts` — confirming `rename` nodes chain onto prior transform
   output, not just the raw source.
6. Do **not** run/save yet — this pipeline is completed in
   [`03-type-casting.md`](03-type-casting.md), which adds the typing step
   before you point it at a real `iceberg_silver` destination.

> 🧪 **Checkpoint**: you can read the compiled SQL after each node you add
> and predict what the next node's SQL will look like before compiling.

## Next document

[`03-type-casting.md`](03-type-casting.md).
