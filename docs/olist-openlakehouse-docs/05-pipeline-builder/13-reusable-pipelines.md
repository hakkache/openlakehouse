# 13 — Reusable Pipelines

**Content type: PROJECT IMPLEMENTATION.** Combines variables
([`06-variables.md`](06-variables.md)) and sub-pipelines
([`10-sub-pipelines.md`](10-sub-pipelines.md)) into one real reuse
pattern applied across all 9 Olist tables.

## Hands-On Walkthrough — one quality-check pipeline, called from 9 tables

1. Recall `qc_not_null_check` from
   [`10-sub-pipelines.md`](10-sub-pipelines.md) — it takes a `table_name`
   variable and reports `null_violations` on that table's `order_id`-style
   key column. Generalize it slightly: add a second variable
   `key_column` (literal, default `"order_id"`) and change its SQL to
   `SELECT count(*) FROM iceberg.silver.{{table_name}} WHERE {{key_column}} IS NULL`.
2. Create 3 tiny parent pipelines, each just: a `literal` variable
   `table_name` / `key_column` pair + one `sub_pipeline:call` node
   pointing at `qc_not_null_check`:
   - `qc_orders`: `table_name=olist_orders`, `key_column=order_id`.
   - `qc_customers`: `table_name=olist_customers`, `key_column=customer_id`.
   - `qc_sellers`: `table_name=olist_sellers`, `key_column=seller_id`.
3. Run all 3. **Expected result**: each reports `null_violations = 0` for
   its own table — the exact same reusable child pipeline logic, called 3
   different ways, with zero duplicated SQL.

## Why this is the "right" pattern vs. copy-pasting a not_null quality node into every pipeline

- **One place to fix a bug**: if the check logic needs to change (e.g.
  also excluding soft-deleted rows), you edit `qc_not_null_check` once —
  all 9 callers pick up the fix on their next run.
- **One place to extend**: add a 4th variable (`min_expected_rows`) to
  `qc_not_null_check` later, and every existing caller keeps working
  (falls back to whatever default you give the new variable) while new
  callers can opt into using it.

## The scaling exercise (do this yourself)

4. Build the remaining 6 `qc_<table>` caller pipelines for
   `olist_order_items`, `olist_payments`, `olist_reviews`,
   `olist_products`, `olist_geolocation`, `category_translation` — same
   3-node pattern each time. This is intentionally left as a repetitive
   exercise: it's the fastest way to internalize that "reusable pipeline"
   really means 9 near-identical 3-node pipelines calling 1 shared child,
   not 9 independently-written not_null checks.

> 🧪 **Checkpoint**: you have 9 tiny caller pipelines, each correctly
> reporting `0` violations, all sharing one real child pipeline's logic.

## Next document

[`14-fourteen-pipeline-scenarios.md`](14-fourteen-pipeline-scenarios.md)
— the module's capstone: 14 progressively harder end-to-end pipeline
scenarios spanning everything covered so far.
