# 04 — Raw Data Preservation

**Content type: PROJECT IMPLEMENTATION.**

## The principle

Bronze exists to answer one question forever: **"what did the source
system actually send us, unmodified?"** Every later layer (Silver's
casting/cleaning, Gold's business logic) is a *derived, re-creatable*
view of Bronze — if a downstream bug is ever found, the fix is to correct
the Silver/Gold transformation and re-run, never to patch Bronze data by
hand. This only works if Bronze is never itself "cleaned."

## What this means concretely for the Olist Bronze tables

- No filtering of "obviously bad" rows in Bronze (a `NULL` `customer_id`
  row, if one existed, still lands in `bronze.olist_customers` — Silver's
  `not_null` quality gate is what rejects it, not the ingestion step).
- No deduplication in Bronze (if the same order appeared twice in the raw
  CSV, both rows land — Silver's `deduplicate` transform is where that's
  handled, see
  [`04-silver-transformation/04-deduplication.md`](../04-silver-transformation/04-deduplication.md)).
- No renaming/reshaping columns in Bronze — column names match the raw
  CSV headers exactly (`customer_zip_code_prefix`, not `zip`).

## Hands-On Walkthrough — prove Bronze is unfiltered raw data

1. Open **SQL Editor** (`http://localhost/sql`) and run:
   ```sql
   SELECT order_status, count(*) AS n
   FROM iceberg.bronze.olist_orders
   GROUP BY order_status
   ORDER BY n DESC;
   ```
   **Expected result**: every real Olist order status appears, including
   ones a naive pipeline might be tempted to filter out early
   (`unavailable`, `canceled`) — Bronze keeps them all. Silver's `regex`
   quality gate (Chapter 6 / [`04-silver-transformation/07-data-quality-gates.md`](../04-silver-transformation/07-data-quality-gates.md))
   validates the *value set*, it does not delete rows from Bronze.
2. Run:
   ```sql
   SELECT count(*) AS total_review_rows,
          count(review_comment_message) AS rows_with_comment
   FROM iceberg.bronze.olist_reviews;
   ```
   **Expected result**: `rows_with_comment` is meaningfully lower than
   `total_review_rows` — most reviews have no written comment. Bronze
   preserves the `NULL`s as-is; Silver's `fill_null` transform (Chapter 6)
   is where you'll decide to replace them with an empty string for
   downstream tooling, not here.

## Why this matters operationally (forward reference)

[`08-advanced-data-engineering/08-reprocessing.md`](../08-advanced-data-engineering/08-reprocessing.md)
and
[`08-advanced-data-engineering/11-data-recovery.md`](../08-advanced-data-engineering/11-data-recovery.md)
both depend on this principle: if a Silver/Gold bug is found six weeks
from now, the recovery procedure is "fix the transformation logic, then
re-run Silver/Gold from Bronze" — this is only possible because Bronze was
never mutated to begin with. If Bronze had been "cleaned" at ingestion
time, that historical raw signal would be permanently lost and true
recovery would be impossible.

> 🧪 **Checkpoint**: you can state, in one sentence, why `bronze.olist_reviews`
> having `NULL` comments is *correct* and not a bug to fix at ingestion time.

## Next document

[`05-reprocessing.md`](05-reprocessing.md).
