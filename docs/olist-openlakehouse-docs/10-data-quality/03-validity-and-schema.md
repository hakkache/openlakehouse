# 03 — Validity and Schema Drift Detection

**Content type: PROJECT IMPLEMENTATION.** Builds the concrete drift-
detection check forward-referenced in
[`08-advanced-data-engineering/03-schema-evolution-and-drift.md`](../08-advanced-data-engineering/03-schema-evolution-and-drift.md).

## Hands-On Walkthrough — a real schema-snapshot-and-compare check

1. Capture today's known-good Bronze schema as a baseline:
   ```sql
   CREATE TABLE iceberg.gold.schema_baseline AS
   SELECT 'olist_orders' AS table_name, column_name, data_type
   FROM iceberg.information_schema.columns
   WHERE table_schema = 'bronze' AND table_name = 'olist_orders';
   ```
2. Build a comparison query you'd run before trusting any future
   re-ingestion:
   ```sql
   SELECT c.column_name, c.data_type AS current_type, b.data_type AS baseline_type
   FROM iceberg.information_schema.columns c
   FULL OUTER JOIN iceberg.gold.schema_baseline b
     ON c.column_name = b.column_name AND c.table_name = b.table_name
   WHERE c.table_schema = 'bronze' AND c.table_name = 'olist_orders'
     AND (c.data_type <> b.data_type OR b.column_name IS NULL OR c.column_name IS NULL);
   ```
   **Expected result**: `0` rows today — no drift, schema matches
   baseline exactly.
3. **Negative test**: add a column to Bronze to simulate real drift:
   ```python
   spark.sql("ALTER TABLE catalog.bronze.olist_orders ADD COLUMN promo_code STRING")
   ```
   Re-run step 2's query. **Expected result**: now returns 1 row —
   `promo_code`, with `baseline_type = NULL` — real, detected drift.
4. Wrap step 2's query as a Pipeline Builder `range`-style custom
   `code:sql` quality check (module 05) that you run **before** every
   Bronze ingestion re-run, so drift is caught at the earliest possible
   point, not discovered downstream in a broken Silver cast.
5. Clean up: `spark.sql("ALTER TABLE catalog.bronze.olist_orders DROP
   COLUMN promo_code")` (Iceberg supports dropping a column safely, same
   metadata-only operation as adding one).

> 🧪 **Checkpoint**: you established a real schema baseline, confirmed
> zero drift, then introduced and detected a real drift event with your
> own comparison query.

## Next document

[`04-referential-integrity.md`](04-referential-integrity.md).
