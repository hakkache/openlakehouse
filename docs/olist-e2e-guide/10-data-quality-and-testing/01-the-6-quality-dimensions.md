# 01 — The 6 Quality Dimensions

## Where each dimension is enforced in this platform

| Dimension | Mechanism | Module reference |
|---|---|---|
| Completeness | `not_null` quality nodes, dbt `not_null` tests | 06 doc 06, 07 doc 03 |
| Uniqueness | `unique` quality nodes, dbt `unique` tests | 06 doc 06, 07 doc 03 |
| Validity | `range`/`regex` quality nodes, `accepted_values` | 06 doc 06, 07 doc 03 |
| Referential integrity | `LEFT JOIN ... WHERE fk IS NULL` orphan checks | this module, doc 02 |
| Freshness | `freshness` quality nodes, `dbt source freshness` | 06 doc 06, 07 doc 01 |
| Business rules | derived columns, cross-fact consistency checks | this module, doc 03 |

## Scenario 1 (Simple) — completeness/uniqueness audit across every table

1. One query auditing every Silver table's primary key at once:
   ```sql
   SELECT 'olist_orders' t, count(*) n, count(DISTINCT order_id) d FROM iceberg.silver.olist_orders
   UNION ALL SELECT 'olist_reviews', count(*), count(DISTINCT review_id) FROM iceberg.silver.olist_reviews;
   ```
   **Expected result**: `olist_reviews` should now show `n = d` (fixed in
   module 05's dedup step) — if not, that's a real regression to
   investigate.

| Table | `n` | `d` | Pass? |
|---|---|---|---|
| `olist_orders` | 99,441 | 99,441 | ✅ |
| `olist_reviews` | equal to `d` | equal to `n` | ✅ (if module 05's fix held) |

> 🧪 **Checkpoint**: this single audit query shows `n = d` for every
> table you've built so far.

## Next document

[`02-referential-integrity-and-schema-drift.md`](02-referential-integrity-and-schema-drift.md).
