# 11 — SCD2 Testing

**Content type: PROJECT IMPLEMENTATION.**

## The 3 invariants every SCD2 table must always satisfy

1. Exactly one `is_current = true` row per natural key.
2. No overlapping validity windows for the same natural key.
3. Every non-current row has a real (non-null) `valid_to`.

## Hands-On Walkthrough — write these as real dbt singular tests

1. Create `tests/assert_dim_sellers_scd2_one_current.sql` (test 1 — fails
   if it returns any rows):
   ```sql
   select seller_id, count(*) as current_count
   from {{ ref('dim_sellers_scd2_dbt') }}
   where is_current = true
   group by seller_id
   having count(*) <> 1
   ```
2. Create `tests/assert_dim_sellers_scd2_no_overlap.sql` (test 2):
   ```sql
   select a.seller_id, a.valid_from, a.valid_to, b.valid_from as b_valid_from
   from {{ ref('dim_sellers_scd2_dbt') }} a
   join {{ ref('dim_sellers_scd2_dbt') }} b
     on a.seller_id = b.seller_id and a.seller_key <> b.seller_key
   where a.valid_from < coalesce(b.valid_to, timestamp '9999-12-31')
     and coalesce(a.valid_to, timestamp '9999-12-31') > b.valid_from
   ```
3. Create `tests/assert_dim_sellers_scd2_valid_to_set.sql` (test 3):
   ```sql
   select * from {{ ref('dim_sellers_scd2_dbt') }}
   where is_current = false and valid_to is null
   ```
4. Run all 3: `docker compose exec dbt dbt test --select assert_dim_sellers_scd2_one_current assert_dim_sellers_scd2_no_overlap assert_dim_sellers_scd2_valid_to_set`.
   **Expected result**: all 3 `PASS` (`0` rows each) against your real
   `dim_sellers_scd2_dbt` table from
   [`10-scd2-dbt-snapshot.md`](10-scd2-dbt-snapshot.md).

## Negative test — prove test 1 catches a real violation

5. Temporarily insert a genuinely broken row (2 concurrent "current"
   versions for one seller) directly via Jupyter/Spark SQL:
   ```python
   spark.sql("""
       INSERT INTO catalog.gold.dim_sellers_scd2_dbt
       SELECT 9999999, seller_id, 'Fake Duplicate City', seller_state,
              current_timestamp(), cast(null as timestamp), true
       FROM catalog.gold.dim_sellers_scd2_dbt WHERE is_current = true LIMIT 1
   """)
   ```
6. Re-run test 1. **Expected result**: `FAIL`, reporting exactly 1
   violating `seller_id` — proof the test genuinely catches a real
   2-current-rows violation. Delete the fake row afterward:
   ```python
   spark.sql("DELETE FROM catalog.gold.dim_sellers_scd2_dbt WHERE seller_key = 9999999")
   ```
7. Re-run test 1 again to confirm it returns to `PASS`.

> 🧪 **Checkpoint**: all 3 invariant tests pass on real data, and you
> watched test 1 correctly fail against a deliberately injected
> violation, then pass again after removing it.

## Next document

[`12-scd2-failure-scenarios.md`](12-scd2-failure-scenarios.md).
