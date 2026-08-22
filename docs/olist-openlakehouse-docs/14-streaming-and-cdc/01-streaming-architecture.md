# 01 — Streaming Architecture

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`infra/kafka/`, `infra/debezium/`, `infra/spark/streaming_orders.py`,
`infra/spark/cdc_sync.py`).**

## Real architecture: two independent streaming sources feed Iceberg

This project has **two separate, genuinely distinct** streaming paths,
not one:

1. **Demo Kafka orders** (`infra/kafka/produce_demo_orders.py`) — a
   synthetic order-events producer, publishing JSON events (`order_id`,
   `customer_id`, `amount`, `status`, `created_at`) to a real Kafka
   topic `orders`, consumed by `infra/spark/streaming_orders.py` via
   Spark Structured Streaming into Iceberg.
2. **Real Postgres CDC** (`infra/debezium/`) — Debezium's PostgreSQL
   connector captures row-level changes from a real `cdc.customers` /
   `cdc.orders` schema (note: **separate** from the main Olist tables),
   publishing Debezium's own change-event format to Kafka, consumed by
   `infra/spark/cdc_sync.py` for MERGE-based sync into Iceberg.

Both paths are genuinely independent — this dataset (`cdc.*`) is **not**
the same as the Olist e-commerce tables used throughout modules 02-13;
it's a dedicated demo schema for exercising CDC mechanics specifically.

## Hands-On Walkthrough — confirm both paths are live

1. `docker compose ps kafka debezium spark` — confirm all 3 are
   `running`/`healthy`.
2. Confirm the topic exists:
   ```powershell
   docker compose exec kafka kafka-topics --bootstrap-server kafka:9092 --list
   ```
   **Expected result**: `orders` (demo producer topic) and a
   Debezium-prefixed topic like `openlakehouse.cdc.orders` (from the
   Postgres connector) both appear.

> 🧪 **Checkpoint**: you confirmed 2 real, independent topics exist —
> one for synthetic demo orders, one for real Postgres CDC — matching
> this module's 2-path architecture exactly.

## Next document

[`02-kafka-fundamentals.md`](02-kafka-fundamentals.md).
