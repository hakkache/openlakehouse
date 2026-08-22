# 02 — The Compute Page

## Scenario 2 (Medium) — real Spark/Trino resource visibility

1. Open the **Compute** page while a real pyspark job (module 06 doc
   09) is running. **Expected result**: real, live resource
   utilization/job status reflecting the actual Spark UI state — cross-
   check both UIs show the same job.
2. Stop the job early (kill it), refresh **Compute**. **Expected
   result**: status updates to reflect the real termination, not a
   stale "running" state.

| Signal | Spark's own UI | App's Compute page |
|---|---|---|
| Job running | shows active stage | shows real matching status |
| Job killed | shows failed/killed | updates to match, not stale |

> 🧪 **Checkpoint**: confirmed the app's Compute page and Spark's own UI
> agree on the real status of the same job, both while running and after
> being killed.

## Next document

[`03-multi-type-audit.md`](03-multi-type-audit.md).
