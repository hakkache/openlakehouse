# 03 — Capacity and Cost

**Content type: PROJECT IMPLEMENTATION + PROPOSED EXTENSION** (real
resource metrics exist today via modules 15/18 docs 01-02; this document
builds a derived cost-estimation view on top of them — not a native
platform feature).

## Hands-On Walkthrough — build a real, derived storage/compute capacity view

1. Real Iceberg storage footprint (per-table, genuinely measurable):
   ```sql
   SELECT table_schema, table_name,
          (SELECT sum(file_size_in_bytes) FROM iceberg.gold."fact_orders$files") AS bytes_used
   FROM iceberg.information_schema.tables WHERE table_name = 'fact_orders';
   ```
   Repeat per table of interest, or check MinIO directly:
   `docker compose exec minio mc du local/warehouse` — **Expected
   result**: a real total byte count for the entire warehouse, directly
   verifiable against your own actual data volume (Olist's ~9 CSVs are
   tens of MB raw; expect a genuinely small total in this project).
2. Real compute utilization over time: query Prometheus (module 15)
   for `spark` CPU/memory usage during your busiest exercises (e.g. the
   14-scenario capstone pipeline from
   [`05-pipeline-builder/14-fourteen-pipeline-scenarios.md`](../05-pipeline-builder/14-fourteen-pipeline-scenarios.md)).
3. **Derive a simple, honest cost model** (illustrative, not a billing
   feature): if this were running on real cloud infrastructure, estimate
   monthly storage cost as `bytes_used / 1e9 * <your cloud's per-GB
   monthly rate>`, and compute cost as `<observed peak core-hours> *
   <your cloud's per-core-hour rate>` — using your own real measured
   numbers from steps 1-2, not made-up placeholder figures.

## The honest scope: no native cost dashboard exists in this project

**PROPOSED EXTENSION**: a real production platform would likely persist
these derived numbers into a scheduled Gold table (via a Dagster job,
module 09) and visualize trend-over-time in Superset (module 12) — a
legitimate next step, not built today; this document establishes the
real underlying metrics such a feature would be built on.

> 🧪 **Checkpoint for the module**: you measured a real total warehouse
> storage footprint and real observed compute utilization during an
> actual heavy workload, and can explain exactly what's missing to turn
> this into an automated cost dashboard.

## Next module

[`19-ai-assistant/01-ai-assistant.md`](../19-ai-assistant/01-ai-assistant.md).
