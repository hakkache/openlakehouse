# 04 — Data Quality Incidents

**Content type: PROJECT IMPLEMENTATION.**

## Incident 1 — a business rule silently breaks after a logic change

1. Reproduce the exact scenario from
   [`08-advanced-data-engineering/06-backfills-and-replay.md`](../08-advanced-data-engineering/06-backfills-and-replay.md)
   (inverted `is_late` operator), but this time discover it via your
   `Platform Health` Grafana dashboard/BI dashboard (module 12/15) rather
   than by deliberately looking for it — check whether the
   `Late Delivery Rate %` Big Number chart from
   [`12-bi-and-analytics/03-executive-dashboard.md`](../12-bi-and-analytics/03-executive-dashboard.md)
   shows an implausible value (e.g. suddenly `>90%` late).
2. **Full incident cycle**: detect via dashboard anomaly → diagnose via
   direct SQL inspection of the `is_late` expression → resolve by fixing
   the operator → backfill via a single pipeline re-run → verify the
   dashboard number returns to a plausible range.

## Incident 2 — cross-fact consistency breaks after a partial rebuild

3. Rebuild only `fact_order_items` (not `fact_orders`) after a schema
   change, leaving them momentarily out of sync.
4. **Detect**: the cross-fact consistency check from
   [`10-data-quality/06-business-rules.md`](../10-data-quality/06-business-rules.md)
   fails.
5. **Resolve**: rebuild `fact_orders` too, re-run the consistency check,
   confirm `0` mismatches.
6. **Prevent recurrence**: chain both rebuilds into one `sub_pipeline`
   parent (per
   [`09-orchestration/02-pipeline-dependencies.md`](../09-orchestration/02-pipeline-dependencies.md))
   so they can never again be run independently/out of sync by mistake.

> 🧪 **Checkpoint**: you found a real quality incident via a dashboard
> anomaly rather than a direct query, and fixed the root cause of
> "partial rebuild causing inconsistency" architecturally (chained
> pipeline), not just for this one instance.

## Next document

[`05-security-incidents.md`](05-security-incidents.md).
