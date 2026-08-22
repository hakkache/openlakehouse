# 01 — Data Quality Strategy

**Content type: PROJECT IMPLEMENTATION.** Synthesizes every quality
mechanism already built across modules 03-09 into one coherent strategy
for the whole Olist project, rather than introducing new mechanisms.

## The 6 dimensions of data quality, mapped to what you've already built

| Dimension | Where you've already implemented it |
|---|---|
| **Completeness** | `not_null` quality nodes ([`04-silver-transformation/07-data-quality-gates.md`](../04-silver-transformation/07-data-quality-gates.md)) |
| **Uniqueness** | `unique` quality nodes, dbt `unique` tests ([`06-dbt/07-tests.md`](../06-dbt/07-tests.md)) |
| **Validity** | `range`/`regex` quality nodes, dbt `accepted_values` |
| **Referential integrity** | dimension/fact join checks ([`07-dimensional-modeling/06-seller-dimension.md`](../07-dimensional-modeling/06-seller-dimension.md)) |
| **Freshness** | `freshness` quality nodes, `dbt source freshness` |
| **Consistency/business rules** | `is_late` derivation, additivity checks ([`02-source-and-data-model/08-business-metrics.md`](../02-source-and-data-model/08-business-metrics.md)) |

## The strategic decision this module adds: where each check runs

- **Silver-layer quality nodes** (module 04/05): catch structural
  problems (nulls, dupes, invalid values) as close to ingestion as
  possible.
- **dbt tests** (module 06): catch the same class of problems for models
  built in dbt, plus enforce dependency-aware test ordering via
  `dbt build`.
- **Gold-layer quality nodes/tests**: catch cross-table problems (a fact
  row with a dangling foreign key) that can only be checked once joins
  exist.

## Hands-On Walkthrough — build the project's one quality-summary query

1. In **SQL Editor**, build a single cross-table completeness summary
   (the starting point this module's remaining documents each add a row
   to):
   ```sql
   SELECT 'olist_orders' AS t, count(*) AS rows_,
          count(*) - count(order_id) AS null_pk
   FROM iceberg.silver.olist_orders
   UNION ALL
   SELECT 'olist_customers', count(*), count(*) - count(customer_id)
   FROM iceberg.silver.olist_customers;
   ```
   **Expected result**: `null_pk = 0` for both — confirms your existing
   quality gates from module 04 are actually holding.

> 🧪 **Checkpoint**: you can name, for any one of the 6 quality
> dimensions, exactly which node/test type in this project implements it
> and where in the pipeline it runs.

## Next document

[`02-completeness-and-uniqueness.md`](02-completeness-and-uniqueness.md).
