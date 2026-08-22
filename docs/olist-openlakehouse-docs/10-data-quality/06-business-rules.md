# 06 — Business Rule Validation

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — validate 2 real cross-table business rules

1. **Rule: every `fact_order_items` row's `price` should be positive**
   (already checked at the Silver layer per
   [`05-pipeline-builder/04-quality-nodes.md`](../05-pipeline-builder/04-quality-nodes.md),
   but re-verify at the Gold/fact layer too, since Gold-layer joins/
   aggregations could theoretically introduce a bug that a Silver-only
   check would miss):
   ```sql
   SELECT count(*) FROM iceberg.gold.fact_order_items WHERE price <= 0;
   ```
   **Expected**: `0`.
2. **Rule: `fact_orders.total_order_value` should equal the sum of its
   `fact_order_items` rows** — a genuine cross-fact-table consistency
   check, the kind of rule that can only be validated once both fact
   tables exist:
   ```sql
   SELECT f.order_id, f.total_order_value, agg.computed_total
   FROM iceberg.gold.fact_orders f
   JOIN (
       SELECT order_id, sum(price) + sum(freight_value) AS computed_total
       FROM iceberg.gold.fact_order_items GROUP BY order_id
   ) agg ON f.order_id = agg.order_id
   WHERE abs(f.total_order_value - agg.computed_total) > 0.01;
   ```
   **Expected result**: `0` rows — confirms `fact_orders` and
   `fact_order_items` were built consistently from the same underlying
   data, not from two divergent transformation paths that happened to
   drift apart.
3. **Negative test**: manually corrupt one `fact_orders` row to break
   this invariant, confirm the check catches it, then restore it:
   ```python
   spark.sql("UPDATE catalog.gold.fact_orders SET total_order_value = 999999 WHERE order_id = (SELECT order_id FROM catalog.gold.fact_orders LIMIT 1)")
   ```
   Re-run step 2's query — **expected**: 1 row now appears. Rebuild
   `fact_orders` (module 07) to restore correctness.

> 🧪 **Checkpoint**: you validated that two independently-built fact
> tables agree on a shared computed value, then proved the check
> genuinely catches a real injected inconsistency.

## Next document

[`07-quality-dashboard.md`](07-quality-dashboard.md).
