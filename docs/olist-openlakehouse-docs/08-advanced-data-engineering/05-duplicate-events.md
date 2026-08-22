# 05 — Duplicate Events

**Content type: PROJECT IMPLEMENTATION.** Generalizes the `deduplicate`
transform node from
[`04-silver-transformation/04-deduplication.md`](../04-silver-transformation/04-deduplication.md)
to the harder, real-world version: choosing the *correct* survivor among
duplicates, not an arbitrary one.

## The limitation flagged earlier, now solved for real

That document noted `ROW_NUMBER() OVER (PARTITION BY seller_id ORDER BY
seller_id)` has no real tiebreak. This document fixes it with a genuine
recency column.

## Hands-On Walkthrough — dedupe by real recency, not an arbitrary tiebreak

1. Build a synthetic scenario with 2 real, *different* versions of one
   seller arriving in the same batch (simulating 2 CDC events for one
   key):
   ```python
   from pyspark.sql import Row
   dupes = spark.createDataFrame([
       Row(seller_id="zz_dup_seller", seller_city="Old City", event_offset=10),
       Row(seller_id="zz_dup_seller", seller_city="New City", event_offset=15),
   ])
   dupes.createOrReplaceTempView("dup_batch")
   ```
2. **Wrong**: dedupe without an order-by recency column (arbitrary
   survivor):
   ```python
   spark.sql("""
       SELECT * FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY seller_id ORDER BY seller_id) AS rn
         FROM dup_batch
       ) WHERE rn = 1
   """).show()
   ```
   **Expected result**: could show either `Old City` or `New City` —
   genuinely undefined which one wins (Trino/Spark make no guarantee when
   the `ORDER BY` key ties completely), demonstrating the real risk.
3. **Correct**: dedupe using the real recency signal
   (`event_offset` here — a Kafka partition offset in a real streaming
   source, per your own project's documented convention):
   ```python
   spark.sql("""
       SELECT * FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY seller_id ORDER BY event_offset DESC) AS rn
         FROM dup_batch
       ) WHERE rn = 1
   """).show()
   ```
   **Expected result**: always `New City` (`event_offset = 15`, the
   higher/later value) — deterministic and correct, every time you
   re-run this cell.

## Why a Kafka partition offset works as a recency column (real platform fact)

Per this platform's own build history: Kafka's per-partition `offset` is
a monotonically increasing integer **as long as there's one partition per
key-space** — this project's existing streaming topics follow that
convention (module 14), which is exactly why `offset DESC` is a safe,
real tiebreak here, not just a convenient example.

> 🧪 **Checkpoint**: you reproduced a real nondeterministic dedupe result
> from an ambiguous tiebreak, then fixed it deterministically using a
> genuine recency column, confirmed by re-running the cell multiple times
> with identical results.

## Next document

[`06-backfills-and-replay.md`](06-backfills-and-replay.md).
