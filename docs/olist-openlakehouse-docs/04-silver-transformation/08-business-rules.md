# 08 — Business Rules in Silver

**Content type: PROJECT IMPLEMENTATION.**

## What belongs here vs. in Gold

Silver business rules are **row-level, source-local** derivations that
don't require joining across tables (that's Gold's job — see
[`02-source-and-data-model/07-star-schema.md`](../02-source-and-data-model/07-star-schema.md)).
The canonical example in this project: deriving `is_late` on
`silver_orders` needs only columns already on the `orders` table itself.

## Hands-On Walkthrough — derive `is_late` with a `derived_column` node

1. Open `silver_orders`. Add a **derived_column** transform node after the
   quality gates from
   [`07-data-quality-gates.md`](07-data-quality-gates.md), with:
   - `name = is_late`
   - `expression = CASE WHEN order_delivered_customer_date > order_estimated_delivery_date THEN true WHEN order_delivered_customer_date IS NULL THEN NULL ELSE false END`
2. Compile. **Expected SQL shape**:
   ```sql
   SELECT *, CASE WHEN order_delivered_customer_date > order_estimated_delivery_date
                  THEN true WHEN order_delivered_customer_date IS NULL THEN NULL
                  ELSE false END AS is_late
   FROM <predecessor>
   ```
3. Add/confirm the destination node `iceberg_silver` / `olist_orders`, run.
4. Verify with real numbers, in **SQL Editor**:
   ```sql
   SELECT is_late, count(*) AS n
   FROM iceberg.silver.olist_orders
   GROUP BY is_late
   ORDER BY is_late;
   ```
   **Expected result**: 3 groups — `false` (delivered on time, the
   majority), `true` (delivered late, a real meaningful minority — this is
   the exact metric [`02-source-and-data-model/08-business-metrics.md`](../02-source-and-data-model/08-business-metrics.md)'s
   "Late delivery rate" is built from), and `NULL` (not yet delivered —
   correctly excluded from the rate's denominator, not counted as
   on-time).

## Why the `NULL` case matters (a real modeling decision, not an edge case to ignore)

If step 1's expression instead wrote a plain
`order_delivered_customer_date > order_estimated_delivery_date` (dropping
the explicit `WHEN ... IS NULL THEN NULL`), SQL's three-valued logic
already makes this comparison evaluate to `NULL` (not `false`) for
undelivered orders — so the explicit `WHEN` clause here is technically
redundant for correctness, but is included because it makes the intent
**readable** to the next engineer, not just correct. This is a real
production-code judgment call: prefer explicit business intent over
relying on implicit SQL semantics, even when they happen to agree.

> 🧪 **Checkpoint**: your `GROUP BY is_late` query shows exactly 3
> non-trivial groups with real counts, and you can explain why the `NULL`
> group must be excluded from any late-delivery-rate calculation.

## Next document

[`09-incremental-processing.md`](09-incremental-processing.md).
