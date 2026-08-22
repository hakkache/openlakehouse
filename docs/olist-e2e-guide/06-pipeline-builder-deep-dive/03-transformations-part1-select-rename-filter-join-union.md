# 03 — Transformations, Part 1: select / rename / filter / join / union

**Content type: CURRENT PLATFORM CAPABILITY, verified from
`_compile_transform` in `pipeline_compiler.py`.**

## Config reference

| Type | Required config keys | Compiles to |
|---|---|---|
| `select` | `columns: [str]` | `SELECT <columns> FROM <pred>` |
| `rename` | `mapping: {old:new}` and/or `keep: [str]` | `SELECT old AS new, ... FROM <pred>` |
| `filter` | `condition: str` (raw SQL) | `SELECT * FROM <pred> WHERE <condition>` |
| `join` | `right_node: str`, `on: str`, `join_type` (default `inner`) | `SELECT * FROM <pred> <TYPE> JOIN <right> ON <on>` |
| `union` | `union_node: str` | `SELECT * FROM <pred> UNION ALL SELECT * FROM <other>` |

## Scenario 1 (Simple) — `select` + `rename`

1. Pipeline `orders_select_rename`: source `bronze.olist_orders` →
   `select` (`columns=["order_id","customer_id","order_status",
   "order_purchase_timestamp"]`) → `rename`
   (`mapping={"order_purchase_timestamp":"purchased_at"}`) →
   `destination(iceberg_silver, table=orders_renamed)`. Run.
2. Verify: `DESCRIBE iceberg.silver.orders_renamed;` **Expected**: exactly
   4 columns, the last one named `purchased_at`.

## Scenario 2 (Medium) — `filter`, with a real negative test

3. Add a `filter` node after `rename`:
   `condition = "order_status = 'delivered'"`.
4. Verify: `SELECT DISTINCT order_status FROM iceberg.silver.orders_renamed;`
   **Expected**: exactly 1 row, `delivered`.
5. **Negative test**: change `condition` to `order_status = 'not_a_real_status'`
   and re-run. **Expected**: `0` rows written — proves the filter is a
   real predicate against real data, not a fixed sample.

## Scenario 3 (Medium→Complex) — `join`, two real Olist tables

6. Pipeline `order_items_with_products`: 2 sources —
   `bronze.olist_order_items` (id `src_items`) and
   `bronze.olist_products` (id `src_products`) — then a `join` node
   whose predecessor is `src_items`, with
   `right_node="src_products"`, `on="product_id = product_id"`,
   `join_type="inner"` → `destination(iceberg_silver, table=order_items_with_products)`.
7. **Real gotcha to observe**: both tables have a `product_id` column —
   `SELECT * FROM ... JOIN ...` will produce **two** `product_id` columns
   in the output (Trino allows this, but any downstream `SELECT
   product_id` becomes ambiguous). Confirm this yourself:
   `DESCRIBE iceberg.silver.order_items_with_products;` **Expected**: you
   see `product_id` listed twice — a real, verifiable footgun, not a
   hypothetical one. Fix it in a later `select`/`rename` node if you
   continue building on this pipeline.
8. Verify row count: **Expected** `112650` (inner join on a required FK,
   every order item has a real product).

## Scenario 4 (Complex) — `union`, combining two differently-filtered branches

9. Pipeline `orders_status_union`: one source branch filtered to
   `order_status = 'delivered'`, a second source branch (same source
   table, separate node) filtered to `order_status = 'canceled'`, joined
   via a `union` node (`union_node` = the canceled branch's node id) →
   `destination(iceberg_gold, table=delivered_and_canceled)`.
10. Verify: `SELECT order_status, count(*) FROM iceberg.gold.delivered_and_canceled GROUP BY order_status;`
    **Expected**: exactly 2 groups, `delivered` and `canceled`, each with
    real non-zero counts — confirm the counts match separate direct
    queries against Bronze for each status.

> 🧪 **Checkpoint**: you've built working `select`, `rename`, `filter`,
> `join`, and `union` nodes against real Olist tables, and personally
> observed the real duplicate-column-name join gotcha.

## Next document

[`04-transformations-part2-aggregate-sort-dedup-cast-fillnull-replace.md`](04-transformations-part2-aggregate-sort-dedup-cast-fillnull-replace.md).
