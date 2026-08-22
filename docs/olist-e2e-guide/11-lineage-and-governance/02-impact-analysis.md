# 02 — Impact Analysis

## Scenario 1 (Medium) — impact analysis, proven with a real edit

1. Pick `iceberg.silver.olist_orders`, note in the graph every downstream
   node that depends on it (should include `fact_orders`,
   `mart_olist_order_summary`, etc. if you built the pipelines that
   consume it).
2. Rename a real column in the `silver_orders` pipeline's select node,
   re-run. **Expected result**: a downstream Gold pipeline referencing
   the old column name now fails — the lineage graph correctly predicted
   this blast radius before you made the change.

## Scenario 2 (Medium→Complex) — root-cause a broken lineage edge

3. Delete the `silver_orders` pipeline definition entirely (not the
   table — just the pipeline). Refresh **Lineage**. **Expected result**:
   the edge into `silver.olist_orders` disappears even though the table
   and its downstream consumers still physically exist — a concrete
   demonstration of "lineage reflects definitions, not physical reality."
   Recreate the pipeline to restore the edge.

## Before/after table

| State | Edge into `silver.olist_orders` visible? | Table/data still exists? |
|---|---|---|
| Pipeline saved | Yes | Yes |
| Pipeline deleted | No | Yes (a real, dangerous discrepancy to be aware of) |
| Pipeline recreated | Yes | Yes |

> 🧪 **Checkpoint**: you predicted and confirmed a real downstream
> failure by tracing the lineage graph before making a column-rename
> change, and reproduced the "deleted pipeline, edge gone, table still
> there" gap.

## Next document

[`03-governance-and-rbac.md`](03-governance-and-rbac.md).
