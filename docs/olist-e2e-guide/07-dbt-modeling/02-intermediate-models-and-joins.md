# 02 — Intermediate Models and Joins

## Scenario 2 (Medium) — intermediate models with joins

1. Build `int_olist_orders_with_revenue.sql` joining
   `stg_olist_orders` to a staged `olist_order_items`, using
   `LEFT JOIN` + `COALESCE(sum(price), 0)`:
   ```sql
   SELECT o.order_id, o.customer_id, o.order_status,
          COALESCE(SUM(i.price), 0) AS total_price,
          COALESCE(SUM(i.freight_value), 0) AS total_freight
   FROM {{ ref('stg_olist_orders') }} o
   LEFT JOIN {{ ref('stg_olist_order_items') }} i ON o.order_id = i.order_id
   GROUP BY o.order_id, o.customer_id, o.order_status
   ```

## Why `LEFT JOIN` here specifically (tie-back to module 03's quirk)

| Join type | Result for an order with 0 line items |
|---|---|
| `INNER JOIN` | order silently disappears from the result set |
| `LEFT JOIN` + `COALESCE` | order stays, with `total_price = 0` |

2. Verify: `SELECT count(*) FROM {{ this }}` — **expected**: `99441`
   (every real order present, matching module 03's ground truth), not a
   smaller number.

> 🧪 **Checkpoint**: `int_olist_orders_with_revenue` has exactly `99441`
> rows — proving no orders were silently dropped by the join.

## Next document

[`03-marts-tests-and-freshness.md`](03-marts-tests-and-freshness.md).
