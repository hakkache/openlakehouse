# 06 — Streaming Production Scenarios

**Content type: PROJECT IMPLEMENTATION + PROPOSED EXTENSION.**

## Scenario A — Kafka consumer lag as a real operational signal

1. Produce 100 events (doc 02) without immediately running the
   streaming job. Check real lag:
   ```powershell
   docker compose exec kafka kafka-consumer-groups --bootstrap-server kafka:9092 --describe --group streaming-orders-group
   ```
   **Expected result**: a real, non-zero `LAG` column — proof events are
   genuinely queued and unconsumed. Run the streaming job (doc 03),
   re-check: **expected** `LAG = 0`.

## Scenario B — replay from the beginning after a bug fix

2. If a Spark schema/transform bug caused bad data to land in
   `catalog.bronze.orders`, the fix (given `startingOffsets =
   "earliest"` and a **fresh** checkpoint directory) is: delete the
   checkpoint dir
   (`docker compose exec spark-master rm -rf
   /opt/spark/spark-events/checkpoints/streaming_orders`), truncate the
   bad Iceberg table, and re-run the streaming job — it will replay
   every event from the beginning of the topic. **Verify**: row count
   after replay matches the real total ever produced.

## Scenario C — the genuine limit of Kafka replay (a documented gap)

3. Kafka topics have finite retention (`log.retention.hours`, defaulting
   to 168h/7 days in most setups). If your bug is discovered **after**
   the retention window has expired for the affected events, replay from
   Kafka is no longer possible — this is a real, honest limitation:
   check your actual topic retention:
   ```powershell
   docker compose exec kafka kafka-configs --bootstrap-server kafka:9092 --entity-type topics --entity-name orders --describe
   ```
   **PROPOSED EXTENSION**: for data you must be able to replay
   indefinitely, land a raw copy in Bronze (unprocessed) immediately on
   ingestion (same principle as
   [`03-bronze-ingestion/04-raw-data-preservation.md`](../03-bronze-ingestion/04-raw-data-preservation.md))
   rather than relying on Kafka retention as your only replay source.

> 🧪 **Checkpoint for the module**: you observed real consumer lag,
> performed a real full replay via checkpoint deletion, and can state
> precisely why Kafka retention — not application logic — is the true
> upper bound on how far back you can ever replay.

## Next module

[`15-observability/01-observability-strategy.md`](../15-observability/01-observability-strategy.md).
