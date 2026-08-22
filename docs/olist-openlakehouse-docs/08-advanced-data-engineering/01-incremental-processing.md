# 01 — Incremental Processing (Real MERGE INTO Pattern)

**Content type: PROJECT IMPLEMENTATION.** Delivers on the forward
reference from
[`04-silver-transformation/09-incremental-processing.md`](../04-silver-transformation/09-incremental-processing.md):
a real, hand-written incremental pipeline using `MERGE INTO`, built and
run outside the Pipeline Builder (which only does full-refresh writes
today).

## Hands-On Walkthrough — incremental `silver_orders_incremental` via raw PySpark

1. In Jupyter, create the target table once if it doesn't exist
   (`writeTo(...).append()` requires this, unlike `createOrReplace()`):
   ```python
   spark.sql("""
       CREATE TABLE IF NOT EXISTS catalog.silver.olist_orders_incremental
       USING iceberg
       AS SELECT * FROM catalog.silver.olist_orders WHERE 1=0
   """)
   ```
2. First incremental run — merge in everything (simulating "first batch
   ever"):
   ```python
   spark.sql("""
       MERGE INTO catalog.silver.olist_orders_incremental t
       USING catalog.silver.olist_orders s
       ON t.order_id = s.order_id
       WHEN MATCHED THEN UPDATE SET *
       WHEN NOT MATCHED THEN INSERT *
   """)
   spark.table("catalog.silver.olist_orders_incremental").count()
   ```
   **Expected result**: `99441`.
3. Simulate "no new data since last run" — re-run the exact same MERGE.
   **Expected result**: still `99441` — every row `MATCHED`, updated
   in place with identical values, no duplication.
4. Simulate one real new order arriving:
   ```python
   from pyspark.sql import Row
   new_order = spark.createDataFrame([Row(order_id="zz_new_order_1", customer_id="zz_cust_1",
       order_status="created", order_purchase_timestamp=None, order_approved_at=None,
       order_delivered_customer_date=None, order_estimated_delivery_date=None)])
   new_order.createOrReplaceTempView("incoming_new_order")
   spark.sql("""
       MERGE INTO catalog.silver.olist_orders_incremental t
       USING incoming_new_order s
       ON t.order_id = s.order_id
       WHEN MATCHED THEN UPDATE SET *
       WHEN NOT MATCHED THEN INSERT *
   """)
   ```
5. Verify: `SELECT count(*) FROM iceberg.silver.olist_orders_incremental;`
   **Expected result**: `99442` — exactly one new row added, proving the
   `MERGE` correctly distinguished "already exists, update" from "new,
   insert."

> 🧪 **Checkpoint**: you ran the same `MERGE` three times with different
> inputs and got exactly the row-count behavior each scenario predicts —
> no duplication on a repeat run, correct addition on a genuinely new row.

## Next document

[`02-idempotency-and-semantics.md`](02-idempotency-and-semantics.md).
