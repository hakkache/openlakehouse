# 01 — Producing and Consuming Kafka Events

## Scenario 1 (Simple) — produce and observe raw Kafka events

1. `docker compose exec kafka-producer python produce_demo_orders.py`
   (or however it's invoked in your compose file) — or run it directly.
2. Consume raw from the CLI to prove events are real:
   ```powershell
   docker compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic orders --from-beginning --max-messages 5
   ```
   **Expected result**: 5 real JSON events with random UUIDs.

## What you should see, exactly

| Field | Expected content |
|---|---|
| Order ID | a real random UUID, different every run |
| Timestamp | current real time at production |
| Payload shape | consistent JSON schema across all 5 messages |

> 🧪 **Checkpoint**: consumed 5 real Kafka messages with genuinely
> random UUIDs, confirming they're produced live, not replayed from a
> fixture.

## Next document

[`02-bounded-streaming-and-checkpoints.md`](02-bounded-streaming-and-checkpoints.md).
