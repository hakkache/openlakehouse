# 03 — Business Rules and Blocking Gates

## Scenario 4 (Complex) — business-rule cross-fact consistency

1. Verify `fact_orders.total_order_value` equals the sum of its
   `fact_order_items` rows:
   ```sql
   SELECT f.order_id FROM iceberg.gold.fact_orders f
   JOIN (SELECT order_id, sum(price)+sum(freight_value) AS computed FROM iceberg.gold.fact_order_items GROUP BY order_id) agg
   ON f.order_id = agg.order_id
   WHERE abs(f.total_order_value - agg.computed) > 0.01;
   ```
   **Expected**: `0` rows. Corrupt one row deliberately, confirm the
   check catches it, then repair.

## Scenario 5 (Complex) — a quality gate that actually blocks a bad write

2. Recall module 06 doc 13: quality nodes alone report violations but
   don't halt a pipeline — you must wire a `control:if` gate yourself.
3. In an advanced-mode pipeline: add a `from_query` variable counting
   `NULL` primary keys, then a **control:if** node whose `false_skip_nodes`
   includes the destination node.
4. **Prove it**: inject a bad row upstream, run the pipeline, confirm the
   destination node shows `SKIPPED` and the real Silver table is
   untouched.

## Observability-only vs. enforcing, side by side

| Design | Bad data detected? | Bad data blocked from writing? |
|---|---|---|
| Quality node alone, no `if` gate | Yes (via `violations` count) | No |
| Quality node + `from_query` variable + `control:if` gating destination | Yes | Yes |

> 🧪 **Checkpoint**: caught a real cross-fact consistency break, and
> built a quality gate that genuinely blocks (not just reports) a bad
> write.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../11-lineage-and-governance/00-index.md`](../11-lineage-and-governance/00-index.md).
