# 04 — Transformations, Part 2: aggregate / sort / deduplicate / cast / fill_null / replace

**Content type: CURRENT PLATFORM CAPABILITY, verified from
`_compile_transform` in `pipeline_compiler.py`.**

## Config reference

| Type | Required config keys | Compiles to |
|---|---|---|
| `aggregate` | `group_by: [str]`, `aggregations: {col:func}` | `SELECT group_by, FUNC(col) AS col_func ... GROUP BY group_by` |
| `sort` | `columns: [str]` | `SELECT * FROM <pred> ORDER BY <columns>` |
| `deduplicate` | `columns: [str]` (optional) | with columns: `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...) = 1`; without: `SELECT DISTINCT *` |
| `cast` | `casts: {col:type}` | `CAST(col AS type) AS col` |
| `fill_null` | `fills: {col:default}` | `COALESCE(col, default) AS col` |
| `replace` | `column: str`, `cases: {old:new}` | `CASE column WHEN old THEN new ... ELSE column END` |

## Scenario 1 (Simple) — `aggregate`: real monthly revenue

1. Pipeline `monthly_revenue`: source `silver.orders_renamed` (from
   module 03) joined (via a `join` node) to `silver.olist_order_items` →
   `aggregate` (`group_by=["order_month"]` — first add a `derived_column`
   for `order_month = date_trunc('month', purchased_at)` — see module 05
   for that node type; for now, just group by the raw purchase date's
   month using an inline expression if your builder supports it directly
   in `group_by`) → `aggregations={"price":"sum","order_id":"count"}` →
   destination.
2. **Expected result**: real monthly totals — cross-check one month
   manually: `SELECT sum(price) FROM iceberg.silver.olist_order_items oi
   JOIN iceberg.silver.orders_renamed o ON oi.order_id=o.order_id WHERE
   date_trunc('month', o.purchased_at) = DATE '2017-07-01';` — must match
   exactly.

## Scenario 2 (Simple) — `sort`

3. Add a `sort` node after the aggregate, `columns=["order_month"]`.
   **Expected result**: rows in `full_sql`'s output are chronologically
   ordered — verify with `SELECT * FROM iceberg.gold.monthly_revenue
   ORDER BY (rowid)` isn't meaningful in Iceberg; instead confirm order
   is preserved through a client fetch without an extra `ORDER BY` (note
   Trino doesn't guarantee physical storage order — this node affects the
   *query result* order, not physical layout).

## Scenario 3 (Medium→Complex) — `deduplicate`: fixing the real duplicate reviews

4. Recall from module 03: `olist_order_reviews` has real duplicate
   `review_id`s. Pipeline `reviews_deduped`: source
   `bronze.olist_order_reviews` → `deduplicate`
   (`columns=["review_id"]`) → destination(`iceberg_silver`,
   `table=reviews_deduped`).
5. Verify:
   ```sql
   SELECT count(*), count(DISTINCT review_id) FROM iceberg.silver.reviews_deduped;
   ```
   **Expected**: both numbers equal (real fix, matching module 05's
   findings from a different node path).
6. **Real gotcha to observe**: the compiled dedup SQL is
   `ROW_NUMBER() OVER (PARTITION BY review_id ORDER BY review_id) = 1` —
   note the `ORDER BY` is the **same** column as the partition, meaning
   ties are broken arbitrarily (any duplicate row could "win"), not by
   recency. Confirm this is fine for review dedup (duplicates are exact
   copies here) but would be **wrong** for CDC-style dedup where you need
   recency ordering (see modules 08/14's `ROW_NUMBER ... ORDER BY offset
   DESC` pattern — a manual `code:sql` node, not this transform).

## Scenario 4 (Medium) — `cast`: fixing floating-point money columns

7. Pipeline step: `cast` node, `casts={"price":"decimal(10,2)",
   "freight_value":"decimal(10,2)"}`. **Prove why this matters**: run
   `SELECT 0.1 + 0.2 = 0.3;` directly in Trino. **Expected**: `false` —
   a real binary floating-point trap. Confirm your cast columns compare
   correctly at 2 decimal places after casting.

## Scenario 5 (Medium) — `fill_null`: the real "orders without payments" gap

8. Recall module 03: some real orders have zero payment rows. In an
   aggregate pipeline joining orders to payments via `LEFT JOIN`, add a
   `fill_null` node: `fills={"total_paid":"0"}`. **Expected result**:
   orders with no payment row show `total_paid = 0`, not `NULL` —
   confirm by counting `WHERE total_paid = 0` and cross-checking against
   module 03's "orders without payment" count.

## Scenario 6 (Complex) — `replace`: normalizing a real messy category column

9. Pipeline on `bronze.olist_products`: some `product_category_name`
   values are `NULL` or use non-Portuguese-normalized spellings. Add a
   `replace` node: `column="product_category_name"`,
   `cases={"'pc_gamer'":"'pcs'"}` (note: the compiler inlines your
   `cases` values as raw SQL literals — always quote string literals
   yourself, e.g. `"'pcs'"` not `"pcs"`, or you'll get a real column-not-
   found error). **Expected result**: verify the exact substitution
   happened; deliberately omit the quotes once to reproduce the real
   error, then fix it.

> 🧪 **Checkpoint**: real aggregate numbers cross-checked manually, real
> reviews deduplicated, a real float-precision bug demonstrated, real
> `NULL` payments handled via `fill_null`, and one real quoting mistake
> in `replace` reproduced and fixed.

## Next document

[`05-transformations-part3-derived-window-pivot-unpivot.md`](05-transformations-part3-derived-window-pivot-unpivot.md).
