# 02 — Bounded Streaming and the Stale-Checkpoint Trap

## Scenario 2 (Medium) — run the bounded streaming job and verify Iceberg landing

1. Run `infra/spark/streaming_orders.py`. **Expected result**: with
   `Trigger.AvailableNow()`, it processes everything currently in the
   topic **once** and stops (not an infinite stream) — confirm the
   process exits.
2. `SELECT count(*) FROM iceberg.bronze.streaming_orders;` — confirm
   real rows landed matching what you produced.
3. Re-run the same script immediately without producing new events.
   **Expected result**: `0` new rows — Structured Streaming's checkpoint
   correctly remembers the last processed offset.

## Scenario 3 (Medium→Complex) — the stale-checkpoint trap, reproduced

4. Kill the streaming job mid-batch (Ctrl+C partway through a large
   produce), then re-run. **Expected (correct) result**: it resumes
   cleanly from the checkpoint. Now deliberately corrupt/half-delete the
   checkpoint directory and re-run. **Expected (the trap)**: the job may
   report `0` rows processed even though real unconsumed data exists —
   confirm this, then fix by fully deleting the checkpoint dir and
   re-running from scratch.

## Checkpoint state matrix

| Checkpoint state | Re-run result |
|---|---|
| Intact, matches last processed offset | Correctly resumes / reports 0 new rows if nothing new |
| Corrupted/partially deleted | May silently report 0 rows despite real unconsumed data (the trap) |
| Fully deleted | Clean restart, reprocesses everything from the beginning |

> 🧪 **Checkpoint**: ran the bounded job twice with correct idempotent
> behavior, and reproduced the real stale-checkpoint trap before fixing
> it by deleting the checkpoint directory.

## Next document

[`03-debezium-cdc.md`](03-debezium-cdc.md).
