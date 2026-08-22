# 03 — Transformations Deep Dive

**Content type: PROJECT IMPLEMENTATION.** Covers the 3 transform types not
yet exercised hands-on in module 04: `join`, `aggregate`, and
`pivot`/`unpivot`.

## Hands-On Walkthrough — `join`: orders + order_items

1. Create pipeline `gold_orders_with_items_demo`.
2. Source node A: `schema = silver`, `table = olist_orders` (built in
   module 04).
3. Source node B: `schema = silver`, `table = olist_order_items`.
4. Add a **join** transform node after source A, `right_node = <source B's
   node id>`, `on = order_id = order_id`, `join_type = inner`.
5. Compile. **Expected SQL shape**:
   ```sql
   SELECT * FROM <A> INNER JOIN <B> ON order_id = order_id
   ```
6. Add destination `iceberg_gold` / `orders_with_items_demo`, run.
7. Verify: `SELECT count(*) FROM iceberg.gold.orders_with_items_demo;`
   **Expected**: `112650` — the `order_items` grain (one row per item),
   since orders with multiple items fan out correctly on join.

## Hands-On Walkthrough — `aggregate`: revenue per order

8. Add an **aggregate** node after the join, `group_by = order_id`,
   `aggregations = {"price": "sum", "freight_value": "sum"}`.
9. Compile. **Expected SQL shape**:
   ```sql
   SELECT order_id, SUM(price) AS price_sum, SUM(freight_value) AS freight_value_sum
   FROM <predecessor> GROUP BY order_id
   ```
10. Change the destination table to `order_revenue_demo`, run, verify:
    ```sql
    SELECT count(*) FROM iceberg.gold.order_revenue_demo;
    ```
    **Expected**: `98666` — fewer than `99441` orders, because a handful
    of orders in this dataset have zero `order_items` rows (a real data
    quirk — cross-check against
    [`02-source-and-data-model/03-source-data-quality.md`](../02-source-and-data-model/03-source-data-quality.md)).

## Hands-On Walkthrough — `pivot`: payment types per order

11. Create pipeline `payment_types_pivot_demo`. Source: `schema = silver`
    (or `bronze` if you haven't built `silver_payments` yet),
    `table = olist_payments`.
12. Add a **pivot** node: `group_by = order_id`, `pivot_column =
    payment_type`, `value_column = payment_value`,
    `values = ['credit_card', 'boleto', 'voucher', 'debit_card']`,
    `agg = sum`.
13. Compile. **Expected SQL shape**: one `SUM(CASE WHEN payment_type =
    'credit_card' THEN payment_value END) AS credit_card` column per
    value, grouped by `order_id`.
14. Add destination `iceberg_gold` / `payment_types_pivot_demo`, run,
    verify:
    ```sql
    SELECT * FROM iceberg.gold.payment_types_pivot_demo LIMIT 5;
    ```
    **Expected result**: 5 rows, one column per payment type, `NULL`
    where an order didn't use that payment type — a real wide/pivoted
    view built entirely from the visual builder, no hand-written SQL.

> 🧪 **Checkpoint**: you built a join, an aggregate, and a pivot, each
> producing a verified row count or shape matching a real, explainable
> business fact about the Olist dataset.

## Next document

[`04-quality-nodes.md`](04-quality-nodes.md).
