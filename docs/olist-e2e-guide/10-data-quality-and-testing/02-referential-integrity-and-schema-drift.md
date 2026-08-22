# 02 — Referential Integrity and Schema Drift

## Scenario 2 (Medium) — referential integrity, proven with a real break

1. ```sql
   SELECT count(*) AS orphans FROM iceberg.gold.fact_orders f
   LEFT JOIN iceberg.gold.dim_customers d ON f.customer_key = d.customer_key
   WHERE d.customer_key IS NULL;
   ```
   **Expected**: `0`.
2. **Negative test**: delete one real `dim_customers` row, re-run.
   **Expected**: `orphans >= 1`. Rebuild the dimension, confirm `0` again.

| Step | `orphans` |
|---|---|
| Before deletion | 0 |
| After deleting 1 `dim_customers` row | ≥ 1 |
| After rebuilding `dim_customers` | 0 |

## Scenario 3 (Medium→Complex) — schema drift detection

3. Snapshot today's Bronze schema (`DESCRIBE iceberg.bronze.olist_orders`
   saved to a text file or table), `ALTER TABLE ... ADD COLUMN` to
   simulate drift, re-compare against the snapshot. **Expected result**:
   your comparison correctly flags exactly the new column. Drop it
   afterward to restore the original schema.

> 🧪 **Checkpoint**: reproduced a real orphan row via deliberate
> deletion, then repaired it, and detected one real deliberately-added
> schema-drift column.

## Next document

[`03-business-rules-and-blocking-gates.md`](03-business-rules-and-blocking-gates.md).
