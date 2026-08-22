# 03 — Immutability Proof and a Deliberate Failure Drill

## The "never mutate Bronze" principle — prove it to yourself

1. Inspect Bronze's real snapshot history:
   ```sql
   SELECT * FROM iceberg.bronze."olist_orders$snapshots";
   ```
   **Expected result**: exactly 1 snapshot (from your `createOrReplace()`
   write) — Bronze is a write-once landing zone in this design; any
   future correction happens by re-running ingestion from the same
   unmodified raw files, never by hand-editing Bronze rows.

## Break-it/detect-it/fix-it: a real ingestion failure

2. Deliberately ingest a corrupted copy (delete a required column from a
   CSV copy, e.g. drop `order_id` from `olist_orders`), attempt the same
   `writeTo` against the existing table using `.append()` instead of
   `.createOrReplace()`. **Expected result**: a real Spark schema-
   mismatch error.
3. Try the same corrupted file with `.createOrReplace()`. **Expected
   result**: this succeeds but silently changes the table's schema —
   confirm via `DESCRIBE iceberg.bronze.olist_orders` that a column is
   now missing. This is the real, concrete reason `.append()` (which
   fails loud) is safer than `.createOrReplace()` (which succeeds quiet)
   for anything beyond first-time ingestion.
4. Fix by re-running against the real, uncorrupted file with
   `.createOrReplace()` to restore the correct schema.

## Comparison table — `.append()` vs `.createOrReplace()`

| Write mode | Requires table to pre-exist? | Behavior on schema mismatch | When to use |
|---|---|---|---|
| `.createOrReplace()` | No | Silently replaces schema | First-time ingestion only |
| `.append()` | Yes | Hard failure | Any subsequent/incremental load |

> 🧪 **Checkpoint**: confirmed exactly 1 snapshot per Bronze table,
> reproduced a real schema-mismatch failure with `.append()`, and
> observed the silent schema change with `.createOrReplace()`.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../05-silver-transformation/00-index.md`](../05-silver-transformation/00-index.md).
