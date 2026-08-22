# 05 — Ordering, Deduplication, and MERGE

**Content type: PROJECT IMPLEMENTATION.** This is the concrete, hands-on
reproduction of the exact real bug class already documented (and reused
throughout modules 07-08) from `infra/spark/cdc_sync.py`'s MERGE logic —
this time triggered against the real Debezium CDC path from doc 04.

## Reproduce the real multi-event-per-batch MERGE bug here

1. In quick succession (same Postgres transaction batch window), run 2
   real writes against the same new customer:
   ```sql
   INSERT INTO cdc.customers (name, email) VALUES ('Carlos Souza', 'carlos@example.com');
   UPDATE cdc.customers SET email = 'carlos.new@example.com' WHERE name = 'Carlos Souza';
   ```
2. If `cdc_sync.py`'s Spark job reads both the insert and update events
   in the **same micro-batch** (a real, plausible outcome given
   Structured Streaming's own batching), and its `MERGE INTO` doesn't
   dedupe first, both rows are evaluated as "NOT MATCHED" against the
   pre-batch Iceberg snapshot — the exact bug documented in
   [`07-dimensional-modeling/12-scd2-failure-scenarios.md`](../07-dimensional-modeling/12-scd2-failure-scenarios.md).
   Run `cdc_sync.py` and check:
   ```sql
   SELECT * FROM iceberg.bronze.cdc_customers WHERE name = 'Carlos Souza';
   ```
   **Expected result** (if the bug is present): possibly 2 rows, or a
   row with the **stale** email — a real, reproducible instance of this
   bug class against genuine CDC data, not a synthetic re-creation.
3. **The fix**: before the `MERGE`, collapse to the latest event per
   key using Kafka's own per-partition `offset` as the deterministic
   recency column:
   ```python
   from pyspark.sql import Window
   from pyspark.sql.functions import row_number, col
   w = Window.partitionBy("id").orderBy(col("_kafka_offset").desc())
   deduped = batch_df.withColumn("rn", row_number().over(w)).filter("rn = 1").drop("rn")
   ```
4. Re-run with the fix applied. **Expected result**: exactly 1 row for
   `Carlos Souza`, with the correct final email
   (`carlos.new@example.com`) — the update won, as it should.

> 🧪 **Checkpoint**: you reproduced this project's most important
> documented MERGE bug against real CDC data (not just a synthetic
> example), and fixed it with the same `ROW_NUMBER`-over-offset dedupe
> pattern used throughout modules 07-08.

## Next document

[`06-streaming-production-scenarios.md`](06-streaming-production-scenarios.md).
