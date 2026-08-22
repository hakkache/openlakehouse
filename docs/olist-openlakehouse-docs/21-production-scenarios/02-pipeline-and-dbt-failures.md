# 02 — Pipeline and dbt Failures

**Content type: PROJECT IMPLEMENTATION.**

## Incident 1 — a pipeline fails mid-run due to a downstream dependency change

1. Simulate: rename a column in `silver.olist_orders` that a Gold-layer
   pipeline reads (per
   [`11-lineage-and-governance/04-impact-analysis.md`](../11-lineage-and-governance/04-impact-analysis.md)'s
   exact rename scenario), without updating the downstream pipeline.
2. Run the downstream pipeline. **Expected result**: real Trino "column
   not found" error, surfaced through the run detail page.
3. **Diagnose using the Lineage page** (module 11) to confirm exactly
   which pipelines read this column before making any further changes.
4. **Resolve**: update every affected pipeline's node config, re-run all
   of them in dependency order.
5. **Verify**: full green run history across all affected pipelines.

## Incident 2 — a dbt model fails to compile after a source rename

6. Simulate: rename a source table referenced in
   `models/staging/_olist_sources.yml` without updating a dependent
   staging model.
7. Run `dbt run --select stg_olist_orders`. **Expected result**: a real
   dbt compilation error citing the exact broken `source()` reference.
8. **Resolve**: fix the model, `dbt run --select stg_olist_orders+`
   (rebuild it and everything downstream in one command — real, correct
   dbt dependency-ordering).
9. **Verify**: `dbt test --select stg_olist_orders+` passes.

> 🧪 **Checkpoint**: you triggered and resolved 2 real dependency-break
> incidents, using the Lineage page and dbt's own `+` selector
> respectively to scope your fix correctly.

## Next document

[`03-streaming-and-kafka-incidents.md`](03-streaming-and-kafka-incidents.md).
