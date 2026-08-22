# 04 — Impact Analysis

**Content type: PROJECT IMPLEMENTATION.**

## The real question impact analysis answers

"If I change table X, what breaks downstream?" — using the real lineage
graph from [`01-lineage.md`](01-lineage.md) to answer this concretely,
rather than guessing.

## Hands-On Walkthrough — trace a real downstream impact

1. Open `http://localhost/lineage`, search for `silver.olist_orders`.
2. **Expected result**: the highlighted subgraph shows every pipeline-
   derived table downstream — likely `gold.fact_orders` and any
   `mart_*` tables built from it.
3. **Concrete scenario**: suppose you plan to rename a column in
   `silver.olist_orders` (e.g. `is_late` → `is_delayed`). Before making
   the change, use the lineage graph to enumerate every pipeline reading
   `silver.olist_orders` as a source — each one is a pipeline you must
   also update.
4. Cross-check against dbt's own dependency graph for anything built via
   dbt instead of Pipeline Builder:
   ```powershell
   docker compose exec dbt dbt list --select +stg_olist_orders+ --project-dir dbt_project --profiles-dir profiles
   ```
   **Expected result**: real model names both upstream (sources) and
   downstream (`int_*`, `mart_*`) of `stg_olist_orders` — dbt's `+`
   selector syntax gives you exact, verified impact analysis for anything
   inside the dbt project specifically, complementing (not replacing) the
   Pipeline Builder lineage graph, since the two systems track different
   halves of this project's real transformations.

## The honest combined limitation

**Documented gap**: no single view combines Pipeline Builder lineage +
dbt lineage into one graph today. A real production rollout of this
platform would need either (a) a shared lineage store both systems write
to, or (b) adopting OpenLineage/OpenMetadata (already present as
`infra/openmetadata/` in this repo) as a unifying layer — a legitimate
next step, not implemented in this project today.

> 🧪 **Checkpoint for the module**: given a real column-rename scenario,
> you can name every pipeline (via the Lineage page) and every dbt model
> (via `dbt list --select +model+`) that would need updating — using two
> real, separate tools, and can explain why a single unified view doesn't
> exist yet.

## Next module

[`12-bi-and-analytics/01-superset-architecture.md`](../12-bi-and-analytics/01-superset-architecture.md).
