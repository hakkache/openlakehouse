# 14 — SCD2 Fact Lookup and Temporal Joins

**Content type: PROJECT IMPLEMENTATION.** The payoff of building SCD2 at
all: a fact table can now join to the dimension version that was
**current at the time the fact happened**, not just "whatever's current
today."

## The temporal join pattern

```sql
SELECT f.*, d.seller_city
FROM fact_order_items f
JOIN dim_sellers_scd2 d
  ON f.seller_id = d.seller_id
 AND f.order_date >= d.valid_from
 AND f.order_date < COALESCE(d.valid_to, TIMESTAMP '9999-12-31')
```

Note this joins on the **natural key** (`seller_id`) plus a date-range
condition — not on `seller_key` directly, since which `seller_key` is
correct depends on *when* the fact occurred.

## Hands-On Walkthrough — prove current-only join gives a different (wrong) answer than a temporal join

1. Using the seller you changed city for in
   [`09-scd2-manual-merge.md`](09-scd2-manual-merge.md), find an order
   from *before* the change:
   ```sql
   SELECT oi.order_id, o.order_purchase_timestamp
   FROM iceberg.silver.olist_order_items oi
   JOIN iceberg.silver.olist_orders o ON oi.order_id = o.order_id
   WHERE oi.seller_id = '<the seller_id you changed>'
   ORDER BY o.order_purchase_timestamp ASC LIMIT 1;
   ```
2. **Wrong approach** — join this order to the seller's **current-only**
   view (`dim_sellers` from module 07's Type-1 build, or
   `WHERE is_current = true` on the SCD2 table):
   ```sql
   SELECT ds.seller_city
   FROM iceberg.gold.dim_sellers_scd2_dbt ds
   WHERE ds.seller_id = '<seller_id>' AND ds.is_current = true;
   ```
   **Expected result**: the **new** city — technically true today, but
   historically wrong for an order that happened *before* the seller
   moved.
3. **Correct approach** — temporal join using the order's real purchase
   timestamp:
   ```sql
   SELECT ds.seller_city
   FROM iceberg.gold.dim_sellers_scd2_dbt ds
   WHERE ds.seller_id = '<seller_id>'
     AND TIMESTAMP '<the order_purchase_timestamp from step 1>' >= ds.valid_from
     AND TIMESTAMP '<same>' < COALESCE(ds.valid_to, TIMESTAMP '9999-12-31');
   ```
   **Expected result**: the **old** city — the historically accurate
   answer for that specific order, different from step 2's result.

## Why this matters for real BI dashboards

[`12-bi-and-analytics/`](../12-bi-and-analytics/)'s "sales by seller
region" style dashboards must use this exact temporal join pattern for
`dim_sellers_scd2`, or every historical report subtly re-attributes past
sales to a seller's *current* location — a real, easy-to-miss correctness
bug in dimensional reporting that this walkthrough just made concretely
visible with your own data.

> 🧪 **Checkpoint**: you produced two genuinely different city values for
> the same order — one from a naive current-only join, one from a correct
> temporal join — and can explain exactly why only the second is
> historically accurate.

## Next document

[`15-scd2-production-patterns.md`](15-scd2-production-patterns.md).
