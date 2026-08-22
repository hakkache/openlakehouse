# 02 — Kafka Fundamentals

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`infra/kafka/produce_demo_orders.py`).**

## Hands-On Walkthrough — produce and consume real events

1. From inside a container on `openlakehouse-net` (e.g. `backend`):
   ```powershell
   docker compose exec backend python /app/../infra/kafka/produce_demo_orders.py --count 20 --bootstrap-servers kafka:9092
   ```
   (adjust the script's mount path to wherever it's actually reachable in
   your compose setup — or run it directly from the `kafka` container if
   `kafka-python` is installed there).
2. **Expected result**: `Sent 20 demo order events to topic 'orders'`.
3. Verify real messages landed:
   ```powershell
   docker compose exec kafka kafka-console-consumer --bootstrap-server kafka:9092 --topic orders --from-beginning --max-messages 5
   ```
   **Expected result**: 5 real JSON events, each with a genuine random
   `order_id` (UUID), `customer_id` (`cust-1` through `cust-50`),
   `amount` (5-500), and one of `PENDING`/`PAID`/`SHIPPED`/`CANCELLED`.
4. Check partition/offset behavior:
   ```powershell
   docker compose exec kafka kafka-run-class kafka.tools.GetOffsetShell --broker-list kafka:9092 --topic orders
   ```
   **Expected result**: real offset numbers reflecting exactly how many
   events you've produced so far — this is the same per-partition offset
   mechanic referenced throughout module 08's dedup-ordering discussions
   (`event_offset DESC` as a real, valid recency tiebreaker).

## Why a random `order_id` (not sequential) matters for later exercises

This demo producer generates a fresh UUID per event — meaning **every**
produced event is, by construction, a distinct new order (never an
update to an existing one). To exercise real duplicate/update scenarios
(needed in
[`05-ordering-dedup-and-merge.md`](05-ordering-dedup-and-merge.md)),
you'll need to deliberately re-send an event with a **reused**
`order_id` — noted explicitly in that document.

> 🧪 **Checkpoint**: you produced and consumed real Kafka messages and
> can read real per-partition offsets for the `orders` topic.

## Next document

[`03-spark-structured-streaming.md`](03-spark-structured-streaming.md).
