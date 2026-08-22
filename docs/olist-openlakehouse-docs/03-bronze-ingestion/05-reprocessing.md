# 05 — Reprocessing Bronze

**Content type: PROJECT IMPLEMENTATION.**

## When you'd reprocess Bronze

- The source vendor sends you a corrected export (e.g. Kaggle publishes a
  fixed version of a CSV with a data-entry error patched).
- You discover the *upload* was truncated/corrupted (Step 2 of
  [`02-jupyter-pyspark-ingestion.md`](02-jupyter-pyspark-ingestion.md))
  and need to redo one table without touching the other 8.
- You're intentionally practicing failure recovery (see
  [`07-ingestion-failures.md`](07-ingestion-failures.md)).

## Hands-On Walkthrough — reprocess a single table without touching the rest

1. Re-open `olist_bronze_ingestion.ipynb` in Jupyter.
2. Add a new cell that reprocesses **only** `olist_sellers` (small file,
   fast to demonstrate with):
   ```python
   df = spark.read.option("header", True).option("inferSchema", True).csv("olist_sellers_dataset.csv")
   df.writeTo("catalog.bronze.olist_sellers").createOrReplace()
   print("reprocessed:", df.count(), "rows")
   ```
   Run it. **Expected output**: `reprocessed: 3095 rows` — same count as
   before, because you re-read the same file (this cell is meant to show
   the *mechanism*; a real reprocess would point at a corrected file).
3. Confirm via **SQL Editor**:
   ```sql
   SELECT count(*) FROM iceberg.bronze.olist_sellers;
   ```
   **Expected result**: `3095` — unchanged, and critically, the other 8
   tables were never touched (verify with
   `SELECT count(*) FROM iceberg.bronze.olist_orders;` → still `99441`).
4. Check the table's Iceberg snapshot history to see the reprocess
   recorded as a new snapshot (not a silent in-place mutation):
   ```sql
   SELECT * FROM iceberg.bronze."olist_sellers$snapshots" ORDER BY committed_at DESC LIMIT 3;
   ```
   **Expected result**: at least 2 snapshot rows — the original ingestion
   and this reprocess — each with its own `snapshot_id` and
   `committed_at` timestamp. This is Iceberg's built-in time-travel
   metadata; you could `SELECT * FROM iceberg.bronze."olist_sellers$snapshots"`
   at any point to audit exactly when a table changed.

## Why `createOrReplace()` (not `append()`) is correct here

`createOrReplace()` fully replaces the table's current data with this
run's DataFrame — appropriate for Bronze because each Olist CSV is a
**complete static extract**, not an incremental delta. If you were
ingesting a table that only ever sends *new* rows since last time (e.g. a
daily order export), `append()` would be correct instead — but
`append()` requires the target table to already exist
(`CREATE TABLE IF NOT EXISTS ... USING iceberg` first), unlike
`createOrReplace()` which creates it on first use. This distinction
matters again in
[`08-advanced-data-engineering/01-incremental-processing.md`](../08-advanced-data-engineering/01-incremental-processing.md).

> 🧪 **Checkpoint**: you reprocessed one table, confirmed the other 8 were
> unaffected, and found 2+ snapshots in `$snapshots` metadata for the
> reprocessed table.

## Next document

[`06-idempotency.md`](06-idempotency.md).
