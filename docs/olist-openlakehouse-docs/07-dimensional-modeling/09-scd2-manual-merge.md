# 09 — SCD2 Manual MERGE

**Content type: PROJECT IMPLEMENTATION.** The hand-written `MERGE INTO`
approach — full manual control, the pattern to understand before trusting
dbt's `snapshot` abstraction (module 06) or comparing against it in
[`10-scd2-dbt-snapshot.md`](10-scd2-dbt-snapshot.md).

## Hands-On Walkthrough — merge a real change into `dim_sellers_scd2`

1. Simulate a source change — one seller moves city. In Jupyter:
   ```python
   changed = spark.sql("""
       SELECT seller_id, 'Rio de Janeiro' as seller_city, seller_state
       FROM catalog.silver.olist_sellers LIMIT 1
   """)
   changed.createOrReplaceTempView("staged_changes")
   changed.show()
   ```
   Note the `seller_id` printed — you'll check its history with it later.
2. Step A — expire the old current row for any changed seller:
   ```python
   spark.sql("""
       MERGE INTO catalog.gold.dim_sellers_scd2 t
       USING staged_changes s
       ON t.seller_id = s.seller_id AND t.is_current = true
          AND (t.seller_city <> s.seller_city OR t.seller_state <> s.seller_state)
       WHEN MATCHED THEN UPDATE SET
           t.valid_to = current_timestamp(), t.is_current = false
   """)
   ```
3. Step B — insert the new current row:
   ```python
   spark.sql("""
       INSERT INTO catalog.gold.dim_sellers_scd2
       SELECT monotonically_increasing_id() + 1000000, s.seller_id, s.seller_city, s.seller_state,
              current_timestamp(), cast(null as timestamp), true
       FROM staged_changes s
       JOIN catalog.gold.dim_sellers_scd2 t
         ON t.seller_id = s.seller_id AND t.is_current = false
        AND t.valid_to >= current_timestamp() - interval 1 minutes
   """)
   ```
   (the `valid_to >= now - 1 minute` join condition ensures this INSERT
   only picks up the row *just* expired by step A in this same run, not
   every historically-expired row for that seller).
4. Verify:
   ```sql
   SELECT seller_key, seller_city, valid_from, valid_to, is_current
   FROM iceberg.gold.dim_sellers_scd2
   WHERE seller_id = '<the seller_id from step 1>'
   ORDER BY valid_from;
   ```
   **Expected result**: **2 rows** — the old city with `is_current =
   false` and a real `valid_to`, and the new city with `is_current = true`
   and `valid_to IS NULL`.

## Why two steps (MERGE then INSERT), not one MERGE with WHEN NOT MATCHED

Iceberg's `MERGE INTO` can't both update an existing row's `is_current`
flag **and** insert a brand-new row keyed by the *same* natural key in one
statement when the new row's surrogate key doesn't exist yet — this
2-step "expire, then insert" pattern is the standard, safe way to
implement SCD2 with `MERGE`, and is what
[`12-scd2-failure-scenarios.md`](12-scd2-failure-scenarios.md) stress-
tests for the exact bug class this project's own build history hit for
real (documented in your repo memory).

> 🧪 **Checkpoint**: exactly 2 historical versions exist for the one
> changed seller, with correct `valid_from`/`valid_to` boundaries and
> exactly one `is_current = true` row.

## Next document

[`10-scd2-dbt-snapshot.md`](10-scd2-dbt-snapshot.md).
