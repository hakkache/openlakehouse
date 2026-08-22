# 03 — Debezium CDC

## Scenario 4 (Complex) — real CDC via Debezium

1. Register the Debezium connector (`infra/debezium/postgres-connector.json`
   / `register-connector.sh`). Confirm via Debezium's REST API
   (`GET /connectors/<name>/status`) it's `RUNNING`.
2. `UPDATE cdc.customers SET city = 'Test City' WHERE customer_id = '<real id>';`
   in Postgres directly. **Expected result**: a real CDC event appears
   on its Kafka topic within seconds — consume it and confirm the
   before/after image (only possible because of `REPLICA IDENTITY FULL`).

## `REPLICA IDENTITY` comparison, proven directly

3. Demonstrate the gap by temporarily setting `REPLICA IDENTITY DEFAULT`
   on the table and repeating the same `UPDATE`. **Expected result**:
   the "before" image in the CDC event is now `null` for unchanged
   columns — a real, visible difference, not a hypothetical one. Revert
   to `REPLICA IDENTITY FULL` afterward.

| `REPLICA IDENTITY` setting | "before" image on UPDATE |
|---|---|
| `FULL` | complete real row, all columns |
| `DEFAULT` | only primary key columns — other "before" values are `null` |

> 🧪 **Checkpoint**: captured 1 real CDC event with a full before/after
> image, and reproduced the real gap when `REPLICA IDENTITY` is not
> `FULL`.

## Next document

[`04-merge-bug-in-cdc-context.md`](04-merge-bug-in-cdc-context.md).
