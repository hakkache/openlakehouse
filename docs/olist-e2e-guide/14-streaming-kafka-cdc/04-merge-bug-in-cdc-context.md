# 04 — The MERGE Bug, Reproduced Live with CDC

Recall module 08 doc 05 — this is the same bug, now reproduced against
**real, live** CDC events instead of simulated batch data.

## Scenario 5 (Complex) — the real MERGE INTO multi-event bug, in a live CDC context

1. In one Postgres transaction, `INSERT` then immediately `UPDATE` the
   same **new** customer row (both change events will likely land in the
   same micro-batch). Run your CDC-to-Iceberg MERGE **without**
   dedup. **Expected (the bug)**: as in module 08, both events show
   "NOT MATCHED" against the pre-batch snapshot — you may get a
   duplicate or stale-value row.
2. Apply the fix: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY
   offset DESC)` before the MERGE. Re-run. **Expected**: exactly 1
   correct row, reflecting the final `UPDATE`.

## Before/after table

| Step | Rows for the new customer | Correct? |
|---|---|---|
| MERGE without dedup | duplicate or stale-value row | ❌ |
| MERGE after `ROW_NUMBER()` dedup on Kafka offset | 1, reflecting the final UPDATE | ✅ |

> 🧪 **Checkpoint**: reproduced the exact same MERGE-multi-event bug from
> module 08 — this time against real, live CDC events — and fixed it the
> same way.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../15-observability-monitoring/00-index.md`](../15-observability-monitoring/00-index.md).
