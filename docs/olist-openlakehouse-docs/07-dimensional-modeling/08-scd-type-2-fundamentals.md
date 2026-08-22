# 08 — SCD Type 2 Fundamentals

**Content type: PROJECT IMPLEMENTATION.**

## The concept, precisely

A Type 2 dimension keeps **every** historical version of a row as a
separate physical row, each tagged with a validity window
(`valid_from`/`valid_to`) and a flag for which one is current
(`is_current`). A fact table joins to the version that was current **at
the time of the fact**, not to "whatever the dimension says now."

## Required columns for this project's `dim_sellers_scd2`

| Column | Purpose |
|---|---|
| `seller_key` | surrogate key — **one per version**, not one per seller |
| `seller_id` | natural key — repeats across a seller's versions |
| `seller_city`, `seller_state` | the tracked attributes |
| `valid_from` | timestamp this version became current |
| `valid_to` | timestamp this version stopped being current (`NULL` = still current) |
| `is_current` | boolean, exactly one `true` row per `seller_id` at any time |

## Hands-On Walkthrough — build `dim_sellers_scd2` version 1 (the initial load)

1. In Jupyter:
   ```python
   df = spark.table("catalog.silver.olist_sellers") \
       .selectExpr(
           "monotonically_increasing_id() as seller_key",
           "seller_id", "seller_city", "seller_state",
           "cast('2024-01-01 00:00:00' as timestamp) as valid_from",
           "cast(null as timestamp) as valid_to",
           "true as is_current"
       )
   df.writeTo("catalog.gold.dim_sellers_scd2").createOrReplace()
   print(df.count())
   ```
2. **Expected output**: `3095` — one current row per seller, matching
   `dim_sellers`'s Type 1 count exactly, because there's no history yet.
3. Verify in **SQL Editor**:
   ```sql
   SELECT count(*) FROM iceberg.gold.dim_sellers_scd2 WHERE is_current = true;
   ```
   **Expected**: `3095` — every row is current on the initial load, by
   definition.

## Why `monotonically_increasing_id()`, not `row_number()`, here

This function generates a globally unique long integer across all Spark
partitions without a full shuffle/sort (unlike `row_number() OVER
(ORDER BY ...)`) — appropriate once you'll be *appending* new surrogate
keys for new versions later (docs 09+), where re-sorting the whole table
on every incremental run would be wasteful. The tradeoff: the generated
keys are not small sequential integers — acceptable for a surrogate key,
since its only requirement is uniqueness, never a specific value.

> 🧪 **Checkpoint**: `dim_sellers_scd2` has `3095` rows, all `is_current =
> true`, ready for the first real change to be merged into it in
> [`09-scd2-manual-merge.md`](09-scd2-manual-merge.md).

## Next document

[`09-scd2-manual-merge.md`](09-scd2-manual-merge.md).
