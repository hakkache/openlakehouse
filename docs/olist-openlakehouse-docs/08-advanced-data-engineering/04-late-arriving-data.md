# 04 — Late-Arriving Data

**Content type: PROJECT IMPLEMENTATION.**

## Two distinct kinds of "late," both real in this project

1. **Late dimension changes** — already fully covered with a hands-on
   reproduction in
   [`07-dimensional-modeling/13-scd2-late-and-out-of-order-changes.md`](../07-dimensional-modeling/13-scd2-late-and-out-of-order-changes.md).
2. **Late fact data** — a fact row referencing a dimension key that
   doesn't exist *yet* (the order arrives before the customer record
   does) — covered here.

## Hands-On Walkthrough — reproduce a late-arriving fact and the "orphan key" problem

1. Simulate a brand-new order for a customer not yet in `dim_customers`:
   ```python
   from pyspark.sql import Row
   late_fact = spark.createDataFrame([
       Row(order_id="zz_late_order", customer_unique_id="zz_unknown_customer", total_order_value=100.0)
   ])
   late_fact.createOrReplaceTempView("late_fact_batch")
   ```
2. A naive fact-load join against `dim_customers`:
   ```python
   spark.sql("""
       SELECT f.order_id, d.customer_key
       FROM late_fact_batch f
       LEFT JOIN catalog.gold.dim_customers d ON f.customer_unique_id = d.customer_unique_id
   """).show()
   ```
   **Expected result**: `customer_key` is `NULL` for this row — the
   dimension lookup genuinely fails, because this customer doesn't exist
   in `dim_customers` yet.

## The 2 real strategies, both valid, pick based on your needs

- **Late-arriving dimension row ("inferred member")**: insert a
  placeholder row into `dim_customers` immediately
  (`customer_key = <new>, customer_unique_id = 'zz_unknown_customer',
  customer_city = 'UNKNOWN'`), so the fact load can proceed with a real
  (if incomplete) key, then backfill the placeholder's real attributes
  once the customer dimension data actually arrives.
- **Quarantine the fact row**: don't load it yet — write it to a
  `gold.fact_orders_quarantine` table and retry the join on the next
  pipeline run, once the dimension catches up.

3. Implement the quarantine approach (simpler, safer default for this
   project):
   ```python
   spark.sql("""
       CREATE TABLE IF NOT EXISTS catalog.gold.fact_orders_quarantine
       USING iceberg AS SELECT * FROM late_fact_batch WHERE 1=0
   """)
   spark.sql("""
       INSERT INTO catalog.gold.fact_orders_quarantine
       SELECT f.* FROM late_fact_batch f
       LEFT JOIN catalog.gold.dim_customers d ON f.customer_unique_id = d.customer_unique_id
       WHERE d.customer_key IS NULL
   """)
   ```
4. Verify: `SELECT count(*) FROM iceberg.gold.fact_orders_quarantine;`
   **Expected result**: `1` — the late row is safely parked, not lost and
   not incorrectly loaded with a `NULL` key.

> 🧪 **Checkpoint**: you reproduced a real dimension-lookup miss and
> chose (and implemented) the quarantine strategy rather than silently
> loading a `NULL` foreign key into a fact table.

## Next document

[`05-duplicate-events.md`](05-duplicate-events.md).
