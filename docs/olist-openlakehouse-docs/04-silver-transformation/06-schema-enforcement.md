# 06 — Schema Enforcement

**Content type: PROJECT IMPLEMENTATION.**

## The problem this solves

Bronze's schema is whatever Spark's CSV inference produced (module 03).
Silver is where you lock down a **stable, intentional** schema — a
consumer of `iceberg.silver.olist_orders` should never be surprised by a
column being renamed, dropped, or retyped without a deliberate pipeline
change.

## Hands-On Walkthrough — the enforced Silver schema for `olist_order_items`

1. Check Bronze's actual columns first:
   ```sql
   DESCRIBE iceberg.bronze.olist_order_items;
   ```
   **Expected**: `order_id, order_item_id, product_id, seller_id,
   shipping_limit_date, price, freight_value`.
2. Create pipeline `silver_order_items`. **Source**: `schema = bronze`,
   `table = olist_order_items`.
3. Add a **select** node listing exactly these 7 columns (even though
   it's the same as Bronze here — this is the point: an explicit
   allow-list, not an implicit passthrough, so a future Bronze schema
   change is caught by an ambiguous-column compile error instead of
   silently flowing through).
4. Add a **cast** node: `price` and `freight_value` to `decimal(10,2)`
   (Bronze inferred these as `double` — `double` is imprecise for
   currency arithmetic; `decimal(10,2)` is the correct type for money).
5. Compile, add destination `iceberg_silver` / `olist_order_items`, run.
6. Verify:
   ```sql
   DESCRIBE iceberg.silver.olist_order_items;
   SELECT count(*) FROM iceberg.silver.olist_order_items;
   ```
   **Expected**: `price`/`freight_value` now `decimal(10,2)`; row count
   `112650` (unchanged from Bronze).

## Why `decimal`, not `double`, for money — a concrete demonstration

7. In **SQL Editor**, run this contrived-but-real float-precision check:
   ```sql
   SELECT 0.1 + 0.2 = 0.3 AS double_math_is_exact;
   ```
   **Expected result**: `false` — classic binary floating-point
   representation error. `decimal` types don't have this problem because
   they store an exact base-10 value. This is why every price/freight/
   payment column in this project's Silver and Gold layers uses `decimal`,
   never `double`.

> 🧪 **Checkpoint**: `iceberg.silver.olist_order_items` has an explicit,
> intentional 7-column schema with `decimal(10,2)` money columns, and you
> reproduced the exact reason `double` is wrong for currency with a single
> query.

## Next document

[`07-data-quality-gates.md`](07-data-quality-gates.md).
