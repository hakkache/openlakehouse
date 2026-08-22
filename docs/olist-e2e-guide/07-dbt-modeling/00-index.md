# Module 07 — dbt Modeling

**Content type: CURRENT PLATFORM CAPABILITY + PROJECT WORK.** dbt-trino
1.10.3, `profiles` method `none`, `+materialized: table` for staging/
intermediate/marts (full-refresh by default) per `dbt_project.yml`.

## Document map

| # | Document | Covers |
|---|---|---|
| 01 | [`01-sources-and-staging.md`](01-sources-and-staging.md) | `sources.yml`, `stg_olist_orders` |
| 02 | [`02-intermediate-models-and-joins.md`](02-intermediate-models-and-joins.md) | Real join gotchas, `LEFT JOIN` + `COALESCE` |
| 03 | [`03-marts-tests-and-freshness.md`](03-marts-tests-and-freshness.md) | Marts, generic + singular tests, `dbt build`, freshness |
| 04 | [`04-snapshots-scd2.md`](04-snapshots-scd2.md) | Real SCD2 via dbt snapshots |
| 05 | [`05-incremental-models.md`](05-incremental-models.md) | `is_incremental()`, idempotency proof |

## Next document

[`01-sources-and-staging.md`](01-sources-and-staging.md).
