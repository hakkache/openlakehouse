# 12 — SCD2 Failure Scenarios (Negative Testing)

**Content type: PROJECT IMPLEMENTATION.** These are real bug classes,
including one this exact platform's own build process hit for real
during development (documented, not hypothetical).

## Scenario A — the multi-event-per-batch MERGE bug (real, previously encountered on this platform)

**The bug**: `MERGE INTO` evaluates every source row against the
target's **single pre-batch snapshot** — not sequentially against its own
in-progress result. If a batch contains 2+ events for the same never-
before-seen natural key (e.g. a seller record that was inserted *and*
changed within the same micro-batch), **both** source rows are
"NOT MATCHED" against the pre-batch target, and a naive
`WHEN NOT MATCHED THEN INSERT` can insert **both**, producing a
duplicate/stale row with no error raised.

**Reproduce it**:
1. In Jupyter, build a batch with 2 events for one brand-new `seller_id`
   that doesn't exist in `dim_sellers_scd2_dbt` yet:
   ```python
   from pyspark.sql import Row
   batch = spark.createDataFrame([
       Row(seller_id="zz_test_seller", seller_city="City A", seller_state="SP", ord=1),
       Row(seller_id="zz_test_seller", seller_city="City B", seller_state="SP", ord=2),
   ])
   batch.createOrReplaceTempView("bad_batch")
   ```
2. Run a **naive** merge (deliberately not deduped first):
   ```python
   spark.sql("""
       MERGE INTO catalog.gold.dim_sellers_scd2_dbt t
       USING bad_batch s
       ON t.seller_id = s.seller_id AND t.is_current = true
       WHEN NOT MATCHED THEN INSERT (seller_key, seller_id, seller_city, seller_state, valid_from, valid_to, is_current)
       VALUES (monotonically_increasing_id(), s.seller_id, s.seller_city, s.seller_state, current_timestamp(), null, true)
   """)
   ```
3. Check the damage:
   ```sql
   SELECT * FROM iceberg.gold.dim_sellers_scd2_dbt WHERE seller_id = 'zz_test_seller';
   ```
   **Expected result**: **2 rows**, both `is_current = true` — exactly
   the bug: two "current" versions for one key, violating invariant 1
   from [`11-scd2-testing.md`](11-scd2-testing.md) (confirm this
   yourself by re-running that document's test 1 — it will now `FAIL`).

**The fix**: dedupe to the latest event per key *before* the `MERGE`:
```python
spark.sql("""
    CREATE OR REPLACE TEMP VIEW deduped_batch AS
    SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY seller_id ORDER BY ord DESC) AS rn
        FROM bad_batch
    ) WHERE rn = 1
""")
```
Re-run the `MERGE` against `deduped_batch` instead of `bad_batch` (after
first deleting the 2 bad test rows:
`DELETE FROM catalog.gold.dim_sellers_scd2_dbt WHERE seller_id =
'zz_test_seller'`). **Expected result**: exactly **1** row for
`zz_test_seller`, with `seller_city = 'City B'` (the latest, per `ord
DESC`).

## Scenario B — forgetting the `is_current = false` predicate on the expire step

If [`09-scd2-manual-merge.md`](09-scd2-manual-merge.md)'s Step A's `ON`
clause omits `AND t.is_current = true`, re-running the expire step a
second time re-expires an *already-expired* row, silently overwriting a
real historical `valid_to` with a new, wrong timestamp. **Detect it**: a
`valid_to` value that doesn't match when the *next* version's
`valid_from` actually started — cross-check
`valid_to` of version N against `valid_from` of version N+1 for the same
key; they should be very close/identical.

## Scenario C — clock skew between the expire step and the insert step

If Steps A and B in
[`09-scd2-manual-merge.md`](09-scd2-manual-merge.md) run far enough apart
in wall-clock time (e.g. a long-running job between them), the new row's
`valid_from` won't exactly match the old row's `valid_to`, leaving a real
gap where **no** version is "current" for that key during the gap. Fix:
compute one shared `current_timestamp()` value into a variable *before*
either step, and reuse that single value in both statements instead of
calling `current_timestamp()` twice.

## Summary table

| Scenario | Root cause | Detection | Fix |
|---|---|---|---|
| A | Multiple events per key in one MERGE batch | 2+ `is_current=true` rows for one key | dedupe via `ROW_NUMBER()` before MERGE |
| B | Missing `is_current=true` predicate on expire | wrong/overwritten `valid_to` on old versions | always scope expire to the currently-current row only |
| C | Two separate `current_timestamp()` calls | a real gap with zero current rows for a key | compute timestamp once, reuse in both steps |

> 🧪 **Checkpoint**: you reproduced Scenario A for real, confirmed the
> exact duplicate-current-row damage, then fixed it with a real dedupe
> step and confirmed exactly 1 row remained.

## Next document

[`13-scd2-late-and-out-of-order-changes.md`](13-scd2-late-and-out-of-order-changes.md).
