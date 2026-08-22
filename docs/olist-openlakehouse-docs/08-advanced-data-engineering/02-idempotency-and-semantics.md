# 02 — Idempotency and Processing Semantics

**Content type: PROJECT IMPLEMENTATION.** Generalizes
[`03-bronze-ingestion/06-idempotency.md`](../03-bronze-ingestion/06-idempotency.md)'s
full-refresh idempotency to incremental (`MERGE`-based) pipelines, and
names the 3 standard processing-semantics terms explicitly.

## The 3 semantics, defined with this project's own examples

| Semantics | Definition | Example already built in this project |
|---|---|---|
| **At-most-once** | an event might be lost, never duplicated | none built yet — riskiest, avoided in this project |
| **At-least-once** | an event might be duplicated, never lost | Kafka's default delivery guarantee (module 14) |
| **Exactly-once** | every event applied exactly one time, end to end | this project's `MERGE INTO ... ON t.key = s.key` pattern, keyed correctly |

## Why `MERGE INTO` on a correct key gives you exactly-once, even over at-least-once delivery

`01-incremental-processing.md`'s step 3 (re-running the identical MERGE)
demonstrated this directly: even if Kafka/Debezium redelivers the exact
same message twice (a real, expected at-least-once behavior — see
[`14-streaming-and-cdc/`](../14-streaming-and-cdc/)), a `MERGE INTO`
keyed on the correct natural key absorbs the duplicate as a harmless
`UPDATE SET * ` no-op, achieving effectively-exactly-once **processing**
semantics on top of at-least-once **delivery**.

## Hands-On Walkthrough — prove double-delivery doesn't double-count

1. Re-run this document's step 4 from
   [`01-incremental-processing.md`](01-incremental-processing.md) (the
   new-order insert) a **second time**, unchanged.
2. Verify: `SELECT count(*) FROM iceberg.silver.olist_orders_incremental
   WHERE order_id = 'zz_new_order_1';`
   **Expected result**: `1` — not `2`. This is exactly-once processing
   semantics achieved via `MERGE`, even though you (simulating a
   redelivery) sent the "same event" twice.

## The one precondition this all depends on (recap, cross-referenced)

None of this works if the source batch itself contains 2+ events for the
*same* never-before-seen key —
[`07-dimensional-modeling/12-scd2-failure-scenarios.md`](../07-dimensional-modeling/12-scd2-failure-scenarios.md)
Scenario A is this exact failure mode. Always dedupe within a batch
first; `MERGE`'s exactly-once guarantee is only *across* batches/runs,
never *within* one un-deduplicated batch.

> 🧪 **Checkpoint**: you sent the same "new order" event twice and
> confirmed exactly one row resulted — real exactly-once processing
> semantics, demonstrated, not just asserted.

## Next document

[`03-schema-evolution-and-drift.md`](03-schema-evolution-and-drift.md).
