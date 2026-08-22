# 11 — Production dbt

**Content type: PROJECT IMPLEMENTATION.**

## Bringing it together: one command builds the whole Olist dbt project

1. Run the entire project in dependency order:
   ```powershell
   docker compose exec dbt dbt build
   ```
   (`dbt build` runs models, tests, snapshots, and seeds together, in
   dependency order — stopping downstream nodes if an upstream one
   fails, same fail-fast principle as
   [`05-pipeline-builder/12-error-handling.md`](../05-pipeline-builder/12-error-handling.md)).
2. **Expected result**: real console output building
   `stg_olist_orders`, `stg_olist_order_items`,
   `int_olist_orders_with_revenue`, `mart_olist_order_summary`,
   `mart_olist_orders_incremental`, running all tests from
   [`07-tests.md`](07-tests.md), and snapshotting
   `olist_sellers_snapshot` — all in one command, correctly ordered.

## Wiring this into the platform's real orchestration

3. Rather than running this by hand forever, wire it into a Pipeline
   Builder `dbt:build` node (per
   [`05-pipeline-builder/11-dbt-integration.md`](../05-pipeline-builder/11-dbt-integration.md)),
   then schedule that pipeline via Dagster — full mechanics in
   [`09-orchestration/03-scheduling.md`](../09-orchestration/03-scheduling.md).

## Production checklist for this dbt project (apply now, verify each item)

| Practice | Verify |
|---|---|
| Every model has at least one test | re-run `dbt test`, expect >0 tests executed for every new model you built this module |
| Sources declare freshness | `dbt source freshness` passes (from `03-sources.md`) |
| No hardcoded schema/table strings | grep your `.sql` files for `iceberg.` — should only appear inside `source()`/`ref()`-resolved compiled output, never typed literally in a model's raw SQL |
| Snapshots run on a real schedule, not ad hoc | tie to Dagster (module 09), not manual `dbt snapshot` calls forever |
| `dbt build` (not just `dbt run`) is what's scheduled | catches test/snapshot regressions the same run that would build a broken mart |

> 🧪 **Checkpoint for the whole module**: a single `dbt build` command
> builds every model, passes every test, and updates the seller snapshot
> — the complete, real dbt project for this Olist build.

## Next module

[`07-dimensional-modeling/01-dimensional-modeling-fundamentals.md`](../07-dimensional-modeling/01-dimensional-modeling-fundamentals.md)
— the largest module in this documentation set (15 documents), building
the full star schema and a deep, production-grade treatment of SCD Type 2.
