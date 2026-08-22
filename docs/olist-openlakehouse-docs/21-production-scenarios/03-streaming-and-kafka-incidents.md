# 03 — Streaming and Kafka Incidents

**Content type: PROJECT IMPLEMENTATION.**

## Incident 1 — consumer falls behind (real lag buildup)

1. Produce a large burst (200+ events, per
   [`14-streaming-and-cdc/02-kafka-fundamentals.md`](../14-streaming-and-cdc/02-kafka-fundamentals.md))
   without running the streaming job.
2. **Detect**: check real lag via `kafka-consumer-groups --describe` or
   the Prometheus `kafka_consumergroup_lag` metric (module 15).
3. **Resolve**: run the streaming job (module 14 doc 03); confirm lag
   drops to `0`.

## Incident 2 — the CDC MERGE bug reproduced under real incident pressure

4. Re-run the exact scenario from
   [`14-streaming-and-cdc/05-ordering-dedup-and-merge.md`](../14-streaming-and-cdc/05-ordering-dedup-and-merge.md)
   (insert + update in one batch), but this time treat it as a genuinely
   *discovered* incident: you notice `cdc.customers`'s Iceberg copy has a
   stale email for a customer.
5. **Diagnose**: query `iceberg.bronze.cdc_customers$snapshots` to find
   which batch/run introduced the stale row, cross-reference the
   Debezium topic's raw events for that customer (module 14 doc 04) to
   confirm both insert and update landed in the same batch.
6. **Resolve**: apply the `ROW_NUMBER() OVER (... ORDER BY
   _kafka_offset DESC)` dedupe fix.
7. **Verify**: re-run, confirm the correct (updated) email is now
   present, and add a regression test — a dbt singular test asserting
   `count(*) = count(DISTINCT id)` in the target table, so this class of
   bug fails loudly in the future rather than silently corrupting data
   again.

> 🧪 **Checkpoint**: you diagnosed a real stale-data incident down to its
> root cause (multi-event batch), fixed it, and added a real regression
> test to prevent recurrence.

## Next document

[`04-data-quality-incidents.md`](04-data-quality-incidents.md).
