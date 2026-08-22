# 06 — Seller Dimension (Fact Tables)

**Content type: PROJECT IMPLEMENTATION.** `dim_sellers` was already built
in [`02-dimension-design.md`](02-dimension-design.md) as the pattern
example — this document uses the now-complete 4 dimensions
(`dim_customers`, `dim_products`, `dim_sellers`, `dim_date`) to build the
2 fact tables.

## Hands-On Walkthrough — `fact_order_items` (the finer grain fact)

1. Create pipeline `fact_order_items_build`.
2. Source: `schema = silver`, `table = olist_order_items`.
3. Add **join** nodes (chained) against `gold.dim_products` (on
   `product_id`) and `gold.dim_sellers` (on `seller_id`) to pull in
   `product_key`/`seller_key`.
4. Add a **join** against `gold.dim_date` on
   `date_format(shipping_limit_date, 'yyyyMMdd') = cast(date_key as varchar)`
   to attach `date_key`.
5. Add a **select** node for the final fact shape:
   `order_id, order_item_id, product_key, seller_key, date_key, price,
   freight_value`.
6. Destination `iceberg_gold` / `fact_order_items`, run, verify:
   ```sql
   SELECT count(*) FROM iceberg.gold.fact_order_items;
   ```
   **Expected result**: `112650` — matches the raw `olist_order_items`
   count; any join that silently drops rows (e.g. an `inner join` against
   a dimension missing a key) would show up here as a smaller number —
   if you see anything less, check with a `LEFT JOIN` diagnostic query
   isolating which dimension join dropped rows.

## Hands-On Walkthrough — `fact_orders` (the coarser grain fact)

7. Create pipeline `fact_orders_build`. Source: `schema = silver`,
   `table = olist_orders`.
8. Join against `gold.dim_customers` on `customer_unique_id` (requires
   first joining `silver.olist_orders.customer_id` back to
   `silver.olist_customers.customer_id` to get `customer_unique_id` —
   add that join first, then join to `dim_customers`).
9. Join against `gold.dim_date` twice — once for `order_purchase_ts` →
   `purchase_date_key`, once for `order_delivered_ts` →
   `delivery_date_key` (two separate joins to the same conformed
   dimension, a real and common star-schema pattern called a "role-
   playing dimension").
10. Add an **aggregate**-then-**join** back to
    `fact_order_items`-derived totals (or reuse
    [`06-dbt/05-intermediate-models.md`](../06-dbt/05-intermediate-models.md)'s
    `int_olist_orders_with_revenue` mart directly as this pipeline's
    source instead, if you already built it — both approaches are valid,
    pick one and note which in your own build notes).
11. Add the `is_late` derived column from
    [`04-silver-transformation/08-business-rules.md`](../04-silver-transformation/08-business-rules.md).
12. Destination `iceberg_gold` / `fact_orders`, run, verify:
    ```sql
    SELECT count(*) FROM iceberg.gold.fact_orders;
    ```
    **Expected result**: `99441`.

> 🧪 **Checkpoint**: `fact_order_items` has `112650` rows,
> `fact_orders` has `99441` rows, and both have zero `NULL` surrogate keys
> where a dimension join should have matched
> (`SELECT count(*) FROM iceberg.gold.fact_orders WHERE customer_key IS NULL`
> returns `0`).

## Next document

[`07-scd-type-0-and-1.md`](07-scd-type-0-and-1.md).
