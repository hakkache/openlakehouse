# 03 — Building Facts

## Scenario 3 (Medium) — the fact tables

1. Build `fact_order_items` (112,650 rows) and `fact_orders` (99,441
   rows), joining every dimension, including `dim_date` **twice**
   (role-playing: `purchase_date_key` + `delivery_date_key`, the latter
   legitimately `NULL` for undelivered orders via `LEFT JOIN`).

## The role-playing join, explicitly

```sql
SELECT o.order_id,
       dc.customer_key,
       dd1.date_key AS purchase_date_key,
       dd2.date_key AS delivery_date_key
FROM stg_orders o
JOIN dim_customers dc ON o.customer_unique_id = dc.customer_unique_id
JOIN dim_date dd1 ON CAST(o.order_purchase_timestamp AS date) = dd1.full_date
LEFT JOIN dim_date dd2 ON CAST(o.order_delivered_customer_date AS date) = dd2.full_date
```

**Real gotcha to confirm**: the second `dim_date` join **must** be
`LEFT JOIN`, not `INNER JOIN` — an `INNER JOIN` would silently drop every
undelivered order from `fact_orders` entirely. Prove this: temporarily
change it to `INNER JOIN`, re-run, and confirm the row count drops below
`99441`. Revert to `LEFT JOIN` and confirm it returns to `99441`.

| Join type on delivery date | Resulting `fact_orders` row count |
|---|---|
| `INNER JOIN` | less than 99,441 (wrong — silently drops undelivered orders) |
| `LEFT JOIN` | exactly 99,441 (correct) |

> 🧪 **Checkpoint**: `fact_order_items` = 112,650 rows, `fact_orders` =
> 99,441 rows, and you've personally proven the `INNER` vs `LEFT` join
> difference on the delivery-date role-playing dimension.

## Next document

[`04-scd1-vs-scd2.md`](04-scd1-vs-scd2.md).
