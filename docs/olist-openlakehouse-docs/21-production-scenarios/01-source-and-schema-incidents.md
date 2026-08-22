# 01 — Source and Schema Incidents

**Content type: PROJECT IMPLEMENTATION.** Real incident-response
scripts, combining scenarios from earlier modules into full narratives.

## Incident 1 — upstream CSV gains an unexpected column

**Trigger**: a re-exported Olist CSV (simulated) now has an extra
`promo_flag` column not present when Bronze ingestion (module 03) was
first built.

1. Simulate: add a `promo_flag` column to a copy of `olist_orders_dataset.csv`
   and re-run the Bronze ingestion notebook against it.
2. **Detect**: your schema-drift check from
   [`10-data-quality/03-validity-and-schema.md`](../10-data-quality/03-validity-and-schema.md)
   flags the new column immediately.
3. **Diagnose**: confirm via `DESCRIBE iceberg.bronze.olist_orders` that
   the column now exists (Spark's schema inference added it automatically
   on read, since Bronze ingestion here doesn't enforce a strict schema).
4. **Resolve**: decide deliberately — either explicitly select only the
   known columns in the ingestion notebook (safest), or accept the new
   column and update the schema baseline. Document your choice.
5. **Verify**: re-run the drift check, confirm it now reports `0` diffs
   against the updated baseline.

## Incident 2 — a source table's primary key is no longer unique

6. Simulate by re-running doc 02 of module 10's `olist_reviews`
   duplicate-`review_id` discovery as a live incident: pretend you
   discovered this for the first time via a **failed** dbt `unique` test
   run in CI.
7. Full incident cycle: detect (dbt test failure) → diagnose (the
   `GROUP BY ... HAVING count(*) > 1` query) → resolve (add
   `deduplicate` node) → verify (re-run dbt test, confirm pass).

> 🧪 **Checkpoint**: you ran 2 full incident cycles from trigger to
> verified resolution, both against real reproducible conditions.

## Next document

[`02-pipeline-and-dbt-failures.md`](02-pipeline-and-dbt-failures.md).
