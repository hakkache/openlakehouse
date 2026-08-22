# 02 — Completeness and Uniqueness

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — the full completeness+uniqueness matrix, all 9 tables

1. Run this in **SQL Editor** — one query auditing every Silver table's
   primary key at once:
   ```sql
   WITH checks AS (
     SELECT 'olist_orders' t, count(*) n, count(DISTINCT order_id) d, count(*)-count(order_id) nulls FROM iceberg.silver.olist_orders
     UNION ALL SELECT 'olist_customers', count(*), count(DISTINCT customer_id), count(*)-count(customer_id) FROM iceberg.silver.olist_customers
     UNION ALL SELECT 'olist_sellers', count(*), count(DISTINCT seller_id), count(*)-count(seller_id) FROM iceberg.silver.olist_sellers
     UNION ALL SELECT 'olist_products', count(*), count(DISTINCT product_id), count(*)-count(product_id) FROM iceberg.silver.olist_products
     UNION ALL SELECT 'olist_reviews', count(*), count(DISTINCT review_id), count(*)-count(review_id) FROM iceberg.silver.olist_reviews
   )
   SELECT t, n, d, nulls,
          (n = d) AS is_unique,
          (nulls = 0) AS is_complete
   FROM checks;
   ```
2. **Expected result**: `is_unique = true` and `is_complete = true` for
   every row **except** `olist_reviews` — check its `is_unique` value
   carefully.
3. If `olist_reviews` shows `is_unique = false` (`n > d`), investigate:
   ```sql
   SELECT review_id, count(*) FROM iceberg.silver.olist_reviews
   GROUP BY review_id HAVING count(*) > 1 LIMIT 5;
   ```
   This is a **real, documented characteristic of the raw Olist
   dataset** — some reviews genuinely have duplicate `review_id` values
   in the source (a real-world data quality quirk, not a pipeline bug).
   Cross-reference
   [`02-source-and-data-model/03-source-data-quality.md`](../02-source-and-data-model/03-source-data-quality.md)
   for how this was originally flagged, and decide here whether your
   `silver_reviews` pipeline needs a `deduplicate` node
   (module 04) keyed on `review_id` — add one now if it's missing, using
   `order_id` + a real timestamp column as the recency tiebreak per
   [`08-advanced-data-engineering/05-duplicate-events.md`](../08-advanced-data-engineering/05-duplicate-events.md).

> 🧪 **Checkpoint**: your one-query audit correctly flags
> `olist_reviews` as the one table needing a real dedup fix, backed by an
> actual duplicate `review_id` example from your own data.

## Next document

[`03-validity-and-schema.md`](03-validity-and-schema.md).
