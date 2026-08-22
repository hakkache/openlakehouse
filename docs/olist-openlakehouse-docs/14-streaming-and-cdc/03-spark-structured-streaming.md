# 03 — Spark Structured Streaming

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`infra/spark/streaming_orders.py`).**

## Real design: `Trigger.AvailableNow()`, not a permanent daemon

**Verified from the script's own docstring**: this job uses
`Trigger.AvailableNow()` — it processes everything currently queued in
Kafka, then **stops**, rather than running forever. This is a deliberate,
documented production pattern (cost-bounded micro-batch, not an always-on
streaming daemon), and makes the job runnable as a simple one-off
`spark-submit` you can observe start-to-finish.

## Hands-On Walkthrough — run the real streaming job end-to-end

1. Ensure you've produced some events first (per doc 02).
2. Run the real job:
   ```powershell
   docker compose exec spark-master spark-submit --master spark://spark-master:7077 --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.9 /opt/spark-apps/streaming_orders.py
   ```
3. **Expected result**: the job starts, processes exactly the queued
   Kafka messages, writes them via `foreachBatch` into
   `catalog.bronze.orders` using a real Iceberg `.append()`, then exits
   (confirmed by the process returning to the shell prompt, not hanging).
4. Verify: `SELECT count(*) FROM iceberg.bronze.orders;` **Expected
   result**: matches the number of events you produced in doc 02.
5. Produce 10 more events (doc 02's script again), re-run the same
   `spark-submit` command. **Expected result**: `startingOffsets =
   earliest` combined with the checkpoint at
   `CHECKPOINT_LOCATION` means only the **new** 10 events are processed
   this time (Spark's own checkpoint tracks the last-consumed offset) —
   verify by re-running the count query: it increases by exactly 10, not
   by re-processing all events again.

## Why `foreachBatch` + Iceberg `.append()` here (not `MERGE`)

Every event from this demo producer is, by construction (doc 02), a
brand-new `order_id` — there's nothing to merge against, so a plain
`.append()` is correct here. Contrast this with
[`04-debezium-cdc.md`](04-debezium-cdc.md)'s CDC path, which genuinely
needs `MERGE` because Postgres row updates/deletes must be reconciled
against existing Iceberg rows.

> 🧪 **Checkpoint**: you ran the real streaming job twice, confirming
> checkpointed exactly-once-per-batch behavior — the second run processed
> only the newly-produced events, not a duplicate full reprocess.

## Next document

[`04-debezium-cdc.md`](04-debezium-cdc.md).
