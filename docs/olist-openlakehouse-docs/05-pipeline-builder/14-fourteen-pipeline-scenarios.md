# 14 — Fourteen Pipeline Scenarios (Simple → Advanced → Complex)

**Content type: PROJECT IMPLEMENTATION.** This is the module's capstone —
14 concrete, buildable pipeline scenarios over the real Olist data,
ordered by difficulty, each naming exactly which node types it exercises.
Build them yourself, in order, as a comprehensive review of everything in
this module.

## Simple (1-4): single-engine, single-table

1. **Bronze passthrough view**: `source(iceberg_table)` → `destination
   (iceberg_gold)`, no transforms — copy `bronze.olist_sellers` verbatim
   into `gold.sellers_raw_copy`. Confirms the minimum viable pipeline.
2. **Column trim**: `source` → `select` → `destination` — reduce
   `olist_products` to just `product_id, product_category_name`.
3. **Type fix**: `source` → `cast` → `destination` — repeat
   [`04-silver-transformation/03-type-casting.md`](../04-silver-transformation/03-type-casting.md)'s
   zip-code fix from scratch, unaided.
4. **Single quality gate**: `source` → `not_null` → `destination` — gate
   `olist_reviews.review_id`.

## Advanced (5-9): multi-node, multi-table, still single-SQL engine

5. **Full Silver pipeline**: `source` → `cast` → `fill_null` →
   `deduplicate` → `not_null` → `unique` → `derived_column` →
   `destination` — build `silver_products` end-to-end in one pipeline
   (you likely built pieces of this pattern already; do the whole thing
   in one continuous build here).
6. **Two-table join + aggregate**: recreate
   [`03-transformations.md`](03-transformations.md)'s order-revenue
   pipeline from scratch, unaided.
7. **Pivot report**: recreate the payment-types pivot from
   [`03-transformations.md`](03-transformations.md), then add a `sort`
   node ordering by total payment value descending.
8. **Multi-gate Gold table**: build `gold.dim_sellers_demo` with 3
   quality nodes (`not_null`, `unique`, `range`) all before the
   destination node.
9. **Business-rule fact table**: `olist_orders` join `olist_order_items`
   → `aggregate` (sum price+freight per order) → `derived_column`
   (`is_late` from module 04's expression, re-joined back to `olist_orders`
   for the delivery dates) → `destination(iceberg_gold)`.

## Complex (10-14): advanced engine, variables/control/sub-pipelines/dbt/API

10. **Parameterized table check**: rebuild
    [`13-reusable-pipelines.md`](13-reusable-pipelines.md)'s
    `qc_not_null_check` + 2 callers, from scratch, unaided.
11. **Conditional alerting pipeline**: `variable(from_query)` counting
    late orders → `control:if` branching to one of two `code:sql` "alert"
    vs. "ok" placeholder nodes, per
    [`07-control-flow.md`](07-control-flow.md).
12. **Looped per-status report**: `variable(literal)` holding a list of
    order statuses → `control:for_each` → `code:sql` body computing a
    count per status, per [`07-control-flow.md`](07-control-flow.md).
13. **External enrichment pipeline**: `api_ingestion:rest_get` fetching
    real BRL exchange rate data →`code:python` extracting the rate →
    `derived_column` applying it to a revenue table, per
    [`09-api-ingestion.md`](09-api-ingestion.md).
14. **Full orchestrated build-and-test**: `source`/`transform` nodes
    landing a fresh Gold table → `dbt:run` node building dependent dbt
    models over it → `dbt:test` node validating them → `control:if`
    branching on the test result variable to a final `code:sql`
    "publish ready" marker vs. a "failed, do not publish" marker. This
    single pipeline exercises **every** node kind covered across this
    entire module.

## Hands-On Walkthrough — the capstone verification

Build scenario 14 (the hardest) and, on its run detail page, confirm:
- At least one node used each of `source`, `transform` (any subtype),
  `quality` (any subtype), `destination`, `variable`, `code`, `control`,
  `dbt` — 8 of the 10 real node kinds in one pipeline (`api_ingestion`
  and `sub_pipeline` are optional additions if you want all 10).
- The run detail page's node list, read top to bottom, tells a complete,
  coherent story of what happened — this readability is the actual
  design goal of the Pipeline Builder, not just its checkpoint list.

> 🧪 **Checkpoint for the whole module**: you've built at least scenarios
> 1, 5, 9, 10, and 14 — one from each difficulty tier — with real,
> verified results at every step.

## Next module

[`06-dbt/01-dbt-architecture.md`](../06-dbt/01-dbt-architecture.md).
