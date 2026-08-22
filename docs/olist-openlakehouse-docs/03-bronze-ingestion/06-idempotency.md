# 06 — Idempotency in Bronze Ingestion

**Content type: PROJECT IMPLEMENTATION.**

## What idempotency means here

An operation is **idempotent** if running it twice produces the same
result as running it once. This matters constantly in data engineering:
notebooks get re-run by accident, Dagster schedules can double-fire,
someone re-triggers a pipeline "just to be safe" — an ingestion step that
is *not* idempotent (e.g. blindly `INSERT`-ing/appending every run)
silently duplicates data on every accidental re-run.

## Why this project's Bronze ingestion is already idempotent

`df.writeTo("catalog.bronze.<table>").createOrReplace()` **is** idempotent
by construction: it fully replaces the table's contents with whatever the
DataFrame currently contains, every time. Running Cell 2 from
[`02-jupyter-pyspark-ingestion.md`](02-jupyter-pyspark-ingestion.md) five
times in a row against the same unchanged CSVs always leaves you with
exactly the same 9 tables at exactly the same row counts.

## Hands-On Walkthrough — prove it

1. In `olist_bronze_ingestion.ipynb`, note the current row count:
   ```sql
   -- in SQL Editor
   SELECT count(*) FROM iceberg.bronze.olist_orders;
   ```
   **Expected**: `99441`.
2. Go back to the notebook and re-run Cell 2 (the full 9-table ingestion
   loop) a second time, without changing anything.
3. Re-run the SQL Editor query. **Expected result**: still `99441` — not
   `198882`. This is the concrete, hands-on proof of idempotency:
   accidentally re-running the whole ingestion notebook did not corrupt
   your data.
4. Contrast this with what *would* happen with `append()` instead of
   `createOrReplace()` — you don't need to actually run this destructive
   version, but understand the failure mode: `df.writeTo(...).append()`
   run twice against the same static file **would** double every row
   count (`198882`, then `298323` on a third run), because `append()` has
   no concept of "have I already added this data" — it blindly adds
   whatever DataFrame you hand it, every time. This is exactly the failure
   this project's choice of `createOrReplace()` avoids for a static,
   full-extract source like Olist's CSVs.

## Where idempotency gets harder (forward references)

- **Incremental sources** (only new/changed rows per run) can't just use
  `createOrReplace()` — they need `MERGE INTO` keyed on a natural key, or
  a dedupe-then-append pattern. Covered in
  [`08-advanced-data-engineering/01-incremental-processing.md`](../08-advanced-data-engineering/01-incremental-processing.md)
  and [`08-advanced-data-engineering/02-idempotency.md`](../08-advanced-data-engineering/02-idempotency.md).
- **Streaming sources** (Kafka/CDC) need checkpointing to be idempotent
  under at-least-once delivery — covered in
  [`14-streaming-and-cdc/`](../14-streaming-and-cdc/).
- **`MERGE INTO` with a batch containing multiple events per key** is a
  real documented bug class in this exact platform (Spark evaluates every
  source row against the same pre-batch target snapshot) — covered in
  full in [`07-dimensional-modeling/12-scd2-failure-scenarios.md`](../07-dimensional-modeling/12-scd2-failure-scenarios.md)
  and [`14-streaming-and-cdc/10-duplicates.md`](../14-streaming-and-cdc/10-duplicates.md).

> 🧪 **Checkpoint**: you re-ran the full ingestion notebook twice and
> confirmed row counts stayed at their correct values both times — real
> proof, not just an assertion.

## Next document

[`07-ingestion-failures.md`](07-ingestion-failures.md).
