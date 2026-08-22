# 05 — Transformations, Part 3: derived_column / window / pivot / unpivot

**Content type: CURRENT PLATFORM CAPABILITY, verified from
`_compile_transform` in `pipeline_compiler.py`.**

## Config reference

| Type | Required config keys | Compiles to |
|---|---|---|
| `derived_column` | `name: str`, `expression: str` (raw SQL) | `SELECT *, <expression> AS <name> FROM <pred>` |
| `window` | `name: str`, `expression: str` (a window-function SQL expression) | identical compiled shape to `derived_column` — it's the same code path |
| `pivot` | `group_by: [str]`, `pivot_column`, `value_column`, `values: [str]`, `agg` (default `sum`) | one `AGG(CASE WHEN pivot_column = v THEN value_column END) AS v` per value |
| `unpivot` | `id_columns: [str]`, `value_columns: [str]`, `key_name`, `value_name` | one `SELECT ... UNION ALL` branch per value column |

## Scenario 1 (Simple) — `derived_column`: the real `is_late` flag

1. On `silver.orders_renamed` (module 03), add a `derived_column` node:
   `name="is_late"`,
   ```sql
   CASE
     WHEN order_delivered_customer_date IS NULL THEN NULL
     WHEN order_delivered_customer_date > order_estimated_delivery_date THEN true
     ELSE false
   END
   ```
2. Verify: `SELECT is_late, count(*) FROM ... GROUP BY is_late;`
   **Expected**: 3 real groups (`true`/`false`/`NULL`) — this becomes the
   foundational metric reused in modules 08, 12, 13, 15, 20.

## Scenario 2 (Medium) — `window`: a real per-customer running total

3. **Important real caveat, discovered by testing**: the compiler's
   `window` type is code-identical to `derived_column` (same
   `if t in ("derived_column", "window"):` branch) — there is **no**
   built-in `PARTITION BY`/`OVER` scaffolding; you must write the entire
   window expression yourself in `expression`, e.g.:
   ```sql
   SUM(price) OVER (PARTITION BY customer_id ORDER BY order_purchase_timestamp)
   ```
4. Add this as a `window` node, `name="running_total"`, on a
   customer-order-joined dataset. **Expected result**: a real
   monotonically non-decreasing running total per customer — verify for
   one real repeat customer (`customer_unique_id`, recall module 03) by
   manually summing their orders in purchase order.

## Scenario 3 (Medium→Complex) — `pivot`: orders by status, per month

5. Pipeline `orders_status_pivot`: source joined/derived to have
   `order_month` and `order_status` columns → `pivot` node:
   `group_by=["order_month"]`, `pivot_column="order_status"`,
   `value_column="order_id"`, `values=["'delivered'","'canceled'",
   "'shipped'"]` (note: `values` entries must be quoted string literals,
   matching the compiler's raw-SQL `CASE WHEN pivot_column = v` — an
   unquoted `values=["delivered"]` produces a "column 'delivered' not
   found" error; reproduce this once, then fix it), `agg="count"`.
6. **Expected result**: one row per month, one column per status, with
   real counts — cross-check one cell manually with a plain `GROUP BY`
   query.

## Scenario 4 (Complex) — `unpivot`: reversing a wide metrics table

7. Build a small wide table first (e.g. via the `pivot` result above, or
   a manually-aggregated table with columns
   `seller_id, revenue, order_count, avg_review_score`). Add an
   `unpivot` node: `id_columns=["seller_id"]`,
   `value_columns=["revenue","order_count","avg_review_score"]`,
   `key_name="metric"`, `value_name="metric_value"`.
8. **Expected result**: 3 output rows per seller (one per original
   column), with `metric` holding the original column name as a string
   and `metric_value` holding its value — confirm total row count is
   exactly `3 × (distinct seller count)`.

## Real gotcha across all 4 of these node types

Every `expression`/`condition`/pivot `values` entry is inlined **as raw
SQL text**, not parameterized — this gives you full SQL power (any valid
Trino expression works) but means **you** are responsible for correct
quoting of string literals; the compiler does no implicit quoting or
escaping. Always test a new expression node in isolation before wiring it
into a larger pipeline.

> 🧪 **Checkpoint**: built a real `is_late` derived column, a real
> per-customer running total window expression, a real status-by-month
> pivot (with the quoting gotcha reproduced), and a real unpivot
> reversing a wide table back to long form.

## Next document

[`06-quality-nodes.md`](06-quality-nodes.md).
