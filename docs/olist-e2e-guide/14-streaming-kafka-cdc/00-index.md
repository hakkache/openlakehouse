# Module 14 — Streaming, Kafka, and CDC

**Content type: CURRENT PLATFORM CAPABILITY + PROJECT WORK.** Real
components: `infra/kafka/produce_demo_orders.py`, Debezium CDC off
Postgres `cdc.customers`/`cdc.orders` (requires `REPLICA IDENTITY FULL`),
`infra/spark/streaming_orders.py` (`Trigger.AvailableNow()` bounded
micro-batch + `foreachBatch` + Iceberg `.append()`).

## Document map

| # | Document | Covers |
|---|---|---|
| 01 | [`01-producing-and-consuming-kafka-events.md`](01-producing-and-consuming-kafka-events.md) | Raw producer/consumer, real events |
| 02 | [`02-bounded-streaming-and-checkpoints.md`](02-bounded-streaming-and-checkpoints.md) | The bounded Spark job, the stale-checkpoint trap |
| 03 | [`03-debezium-cdc.md`](03-debezium-cdc.md) | Real CDC events, `REPLICA IDENTITY FULL` |
| 04 | [`04-merge-bug-in-cdc-context.md`](04-merge-bug-in-cdc-context.md) | The module 08 MERGE bug, reproduced live with CDC |

## Next document

[`01-producing-and-consuming-kafka-events.md`](01-producing-and-consuming-kafka-events.md).
