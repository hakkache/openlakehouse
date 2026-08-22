# 07 — SCD Types 0 and 1 (Before Type 2)

**Content type: PROJECT IMPLEMENTATION.**

## SCD Type 0: never changes

`dim_date`'s `date_key`/`full_date` never change once generated — this is
Type 0 ("fixed") by definition, no special handling needed.

## SCD Type 1: overwrite, no history

Every dimension you've built so far (`dim_customers`, `dim_products`,
`dim_sellers`) currently uses Type 1 behavior implicitly: rebuilding the
pipeline overwrites the whole table, so if a seller's city changes in the
source, the dimension just reflects the new value — the old value is
gone, with no trace it ever existed.

## Hands-On Walkthrough — observe Type 1 behavior directly, then feel its limitation

1. Note a real seller's current city:
   ```sql
   SELECT seller_id, seller_city FROM iceberg.gold.dim_sellers LIMIT 1;
   ```
   (note the `seller_id` and `seller_city` returned).
2. Update that seller's city in `bronze.olist_sellers` (via a quick
   Jupyter cell using `spark.sql("UPDATE ...")` or by rebuilding the row
   via `createOrReplace()` with one changed value — Iceberg via Spark SQL
   supports `UPDATE catalog.bronze.olist_sellers SET seller_city =
   'Rio de Janeiro' WHERE seller_id = '<id>'` directly).
3. Re-run `silver_sellers` (module 04) then `dim_sellers_build` (module
   07 doc 02).
4. Re-run step 1's query. **Expected result**: the new city — correct for
   *current* reporting, but notice: there is no way to answer "what city
   was this seller in on 2017-05-01?" anymore. The old value is gone.
   This is the exact limitation Type 2 exists to solve.

## Where Type 1 is still the right choice

Not every attribute needs history. A seller's `seller_zip_code_prefix`
being corrected due to a typo (not a genuine business change) is a case
where Type 1 overwrite is *correct* — you don't want a wrong historical
value preserved as if it were meaningful. The judgment of "does this
column's change represent real business history, or a data-quality fix"
is itself part of dimensional modeling design, covered further in
[`15-scd2-production-patterns.md`](15-scd2-production-patterns.md).

> 🧪 **Checkpoint**: you changed one real seller's city, rebuilt the
> dimension, confirmed the new value is the only one visible, and can
> explain exactly why that's a real limitation for historical reporting.

## Next document

[`08-scd-type-2-fundamentals.md`](08-scd-type-2-fundamentals.md) — the
start of this module's deepest, most-expanded section.
