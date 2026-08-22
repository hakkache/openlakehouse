# 08 — Bronze Testing

**Content type: PROJECT IMPLEMENTATION.**

## What "testing" means at the Bronze layer

Bronze has no business logic to unit-test — the only things worth
verifying are: **did the expected tables get created, with the expected
row counts, and the expected columns.** This document gives you a single
reusable verification script/checklist to run after any ingestion or
reprocessing step, rather than remembering ad hoc checks each time.

## Hands-On Walkthrough — the Bronze verification checklist

Run every query below in **SQL Editor** (`http://localhost/sql`) right
after finishing [`02-jupyter-pyspark-ingestion.md`](02-jupyter-pyspark-ingestion.md).

1. **Row counts** — one query, all 9 tables:
   ```sql
   SELECT 'olist_customers' AS t, count(*) AS n FROM iceberg.bronze.olist_customers
   UNION ALL SELECT 'olist_orders', count(*) FROM iceberg.bronze.olist_orders
   UNION ALL SELECT 'olist_order_items', count(*) FROM iceberg.bronze.olist_order_items
   UNION ALL SELECT 'olist_payments', count(*) FROM iceberg.bronze.olist_payments
   UNION ALL SELECT 'olist_reviews', count(*) FROM iceberg.bronze.olist_reviews
   UNION ALL SELECT 'olist_products', count(*) FROM iceberg.bronze.olist_products
   UNION ALL SELECT 'olist_sellers', count(*) FROM iceberg.bronze.olist_sellers
   UNION ALL SELECT 'olist_geolocation', count(*) FROM iceberg.bronze.olist_geolocation
   UNION ALL SELECT 'category_translation', count(*) FROM iceberg.bronze.category_translation;
   ```
   **Expected result** (9 rows, exact values):
   | t | n |
   |---|---|
   | olist_customers | 99441 |
   | olist_orders | 99441 |
   | olist_order_items | 112650 |
   | olist_payments | 103886 |
   | olist_reviews | 104162 |
   | olist_products | 32951 |
   | olist_sellers | 3095 |
   | olist_geolocation | 1000163 |
   | category_translation | 71 |

2. **Schema shape** — confirm the natural keys used throughout this
   project's later modeling actually exist and have the expected type:
   ```sql
   DESCRIBE iceberg.bronze.olist_customers;
   ```
   **Expected**: `customer_id` and `customer_unique_id` both present as
   `varchar` — this is the exact pair
   [`05-grain-analysis.md`](../02-source-and-data-model/05-grain-analysis.md)
   depends on.

3. **No accidental full-table duplication** — re-run the row-count query
   from Step 1 a second time. **Expected**: identical numbers (this is the
   idempotency check from [`06-idempotency.md`](06-idempotency.md), now
   folded into the standard checklist).

4. **Null-shape sanity check** on a known-nullable column:
   ```sql
   SELECT
     count(*) AS total,
     count(review_comment_message) AS non_null_comments,
     count(*) - count(review_comment_message) AS null_comments
   FROM iceberg.bronze.olist_reviews;
   ```
   **Expected**: a large `null_comments` value (most reviews have no
   comment) — confirms Bronze correctly preserved `NULL`s rather than
   Spark's CSV reader having coerced them to empty strings (which would
   show `null_comments = 0` and be a red flag).

## Turning this into a repeatable script

Rather than re-typing these queries by hand every time, save Step 1's
query as a favorite/snippet in the SQL Editor (if your version supports
it), or keep this document open as your literal checklist after every
Bronze reprocessing exercise in
[`08-advanced-data-engineering/`](../08-advanced-data-engineering/).

> 🧪 **Checkpoint for the whole module**: all 4 checklist steps above pass
> with the exact expected values. This closes out
> `03-bronze-ingestion/` — every one of the original guide's Chapter 3
> checkpoints, plus the row-level, schema-level, idempotency, and
> null-handling checks a real production ingestion job would also need.

## Next module

[`04-silver-transformation/01-silver-architecture.md`](../04-silver-transformation/01-silver-architecture.md).
