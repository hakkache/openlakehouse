# 07 — Partitioning and Small Files

**Content type: PROJECT IMPLEMENTATION.**

## Why this matters even for a "small" dataset like Olist

99,441 orders is small by big-data standards, but the *pattern* you'd
apply to a much larger version of this same dataset is identical — learn
it now, on data small enough to inspect every result directly.

## Hands-On Walkthrough — inspect and add real partitioning

1. Check `fact_orders`'s current file layout:
   ```sql
   SELECT count(*) AS file_count FROM iceberg.gold."fact_orders$files";
   ```
   **Expected result**: likely a small number (1-4) — this table was
   written in one shot from one Spark job, so there's no small-files
   problem yet, but also no partitioning benefit for a query that only
   needs one month's data.
2. Add real partitioning by `order_month` (using `dim_date`'s attributes,
   or a derived column on the fact table itself):
   ```python
   df = spark.table("catalog.gold.fact_orders")
   df.writeTo("catalog.gold.fact_orders_partitioned") \
     .partitionedBy("purchase_date_key") \
     .createOrReplace()
   ```
   (partitioning by the full `date_key` integer is finer than by month —
   for a real production table you'd derive a coarser `year_month` column
   first; this demo uses the existing `date_key` column directly for
   simplicity).
3. Compare a month-scoped query's scanned-data footprint:
   ```sql
   EXPLAIN ANALYZE
   SELECT count(*) FROM iceberg.gold.fact_orders_partitioned
   WHERE purchase_date_key BETWEEN 20170101 AND 20170131;
   ```
   **Expected result**: the query plan shows partition pruning — far
   fewer files/bytes scanned than the equivalent query against the
   unpartitioned `fact_orders` table (compare by running the same
   `EXPLAIN ANALYZE` against `fact_orders` too and comparing the reported
   scanned bytes).

## Simulating and fixing a real small-files problem

4. Deliberately create a small-files problem by writing in many tiny
   batches:
   ```python
   for i in range(20):
       spark.table("catalog.gold.fact_orders").limit(100) \
           .writeTo("catalog.gold.fact_orders_small_files_demo").append() if i > 0 else \
       spark.table("catalog.gold.fact_orders").limit(100) \
           .writeTo("catalog.gold.fact_orders_small_files_demo").createOrReplace()
   ```
5. Check the damage: `SELECT count(*) FROM iceberg.gold."fact_orders_small_files_demo$files";`
   **Expected result**: `20` small files for what should be one
   consolidated dataset.
6. Fix it with Iceberg's real compaction procedure:
   ```sql
   ALTER TABLE iceberg.gold.fact_orders_small_files_demo EXECUTE optimize;
   ```
7. Re-check: **Expected result**: file count drops to `1` (or a small
   number), same total row count — real, working compaction.

> 🧪 **Checkpoint**: you compared partition-pruned vs. full-scan query
> plans with real scanned-byte numbers, then created and fixed a real
> small-files problem with `EXECUTE optimize`.

## Next document

[`08-performance-optimization.md`](08-performance-optimization.md).
