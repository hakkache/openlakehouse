# 05 — Null Handling

**Content type: PROJECT IMPLEMENTATION.**

## Where real nulls exist in this dataset

[`03-bronze-ingestion/04-raw-data-preservation.md`](../03-bronze-ingestion/04-raw-data-preservation.md)
already showed `bronze.olist_reviews.review_comment_message` has many real
`NULL`s (most reviews have no written comment). This is Silver's first
place to make a deliberate decision about them.

## Hands-On Walkthrough

1. Confirm the null count first, in **SQL Editor**:
   ```sql
   SELECT count(*) - count(review_comment_message) AS null_comments,
          count(*) - count(review_comment_title) AS null_titles
   FROM iceberg.bronze.olist_reviews;
   ```
   **Expected result**: `null_comments` is a large number (most rows);
   `null_titles` is even larger (titles are rarer than comments).
2. Create pipeline `silver_reviews`. **Source node**: `schema = bronze`,
   `table = olist_reviews`.
3. Add a **fill_null** transform node, `fills`:
   ```json
   { "review_comment_message": "''", "review_comment_title": "''" }
   ```
   (empty-string literals, quoted for SQL — check your Pipeline Builder's
   exact literal-quoting convention in its config field help text).
4. Compile. **Expected result**:
   ```sql
   SELECT COALESCE(review_comment_message, '') AS review_comment_message,
          COALESCE(review_comment_title, '') AS review_comment_title, ...
   FROM <predecessor>
   ```
5. Add destination `iceberg_silver` / `olist_reviews`, run it.
6. Verify the fix:
   ```sql
   SELECT count(*) - count(review_comment_message) AS null_comments
   FROM iceberg.silver.olist_reviews;
   ```
   **Expected result**: `0` — no nulls remain, only empty strings.

## Why empty string, not a sentinel like `"N/A"`

An empty string keeps `LENGTH(review_comment_message)` and
`review_comment_message = ''` both meaningful for "no comment written" —
a sentinel like `"N/A"` would need every downstream query to know about
and filter that magic value. Choose whichever convention matches your own
downstream consumers, but **document the choice** (this callout is that
documentation for this project).

## The alternative: leave it `NULL` on purpose

Not every null should be filled. `order_delivered_customer_date` being
`NULL` on an order genuinely means "not yet delivered" — filling it with a
fake date would corrupt the `is_late` derivation used throughout this
project (see
[`02-source-and-data-model/08-business-metrics.md`](../02-source-and-data-model/08-business-metrics.md)).
`fill_null` is a tool to apply selectively, not a blanket step.

> 🧪 **Checkpoint**: `iceberg.silver.olist_reviews` has zero nulls in the
> two text columns, while `iceberg.silver.olist_orders`'s delivery-date
> columns still correctly contain real nulls for undelivered orders.

## Next document

[`06-schema-enforcement.md`](06-schema-enforcement.md).
