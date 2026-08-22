# 03 — Deduplicating Reviews

## Scenario 3 (Medium→Complex) — fixing the real duplicate `review_id`s

Recall from module 03: `olist_order_reviews` has real duplicate
`review_id`s (a genuine data-quality issue, not hypothetical).

1. Build `silver_reviews`: source `bronze.olist_order_reviews` → a
   **deduplicate** node on `review_id` → destination
   `iceberg_silver.olist_reviews`.
2. Run, then verify:
   ```sql
   SELECT count(*), count(DISTINCT review_id) FROM iceberg.silver.olist_reviews;
   ```
   **Expected result**: both numbers now equal — the real duplicates from
   Bronze are gone.

## Before/after comparison table

| Metric | Bronze (`bronze.olist_order_reviews`) | Silver (`silver.olist_reviews`) |
|---|---|---|
| `count(*)` | 104,162 | equal to `count(DISTINCT review_id)` |
| `count(DISTINCT review_id)` | fewer than `count(*)` | same as `count(*)` |

> 🧪 **Checkpoint**: `silver.olist_reviews` shows `count(*) = count(DISTINCT review_id)`.

## Next document

[`04-derived-columns-is-late.md`](04-derived-columns-is-late.md).
