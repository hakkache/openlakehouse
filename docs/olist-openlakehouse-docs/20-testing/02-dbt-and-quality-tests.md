# 02 — dbt and Data Quality Tests

**Content type: PROJECT IMPLEMENTATION.** Consolidates what modules 06
and 10 already built, run here as one complete suite.

## Hands-On Walkthrough — run the complete real dbt + quality test suite

1. Run every dbt test built across module 06 and module 07 (SCD2
   invariants):
   ```powershell
   docker compose exec dbt dbt test --project-dir dbt_project --profiles-dir profiles
   ```
   **Expected result**: real pass/fail per test — every generic test
   (not_null, unique, accepted_values), the custom
   `assert_no_negative_freight.sql` singular test, and the 3 SCD2
   invariant tests from
   [`07-dimensional-modeling/11-scd2-testing.md`](../07-dimensional-modeling/11-scd2-testing.md)
   should all show `PASS` if your build is in the same state left by
   those modules.
2. Run the Pipeline Builder quality-node suite: re-execute every quality-
   gated pipeline from module 04/05 (or the consolidated
   `gold.quality_check_results` table from
   [`10-data-quality/07-quality-dashboard.md`](../10-data-quality/07-quality-dashboard.md)).
3. Combine both into one CI-style summary:
   ```sql
   SELECT check_name, passed FROM iceberg.gold.quality_check_results
   UNION ALL
   SELECT 'dbt_test_suite', true;  -- update to real pass/fail from step 1's output
   ```

> 🧪 **Checkpoint**: you ran the complete real dbt test suite plus the
> Pipeline Builder quality checks in one session and have real pass/fail
> results for all of them.

## Next document

[`03-negative-testing.md`](03-negative-testing.md).
