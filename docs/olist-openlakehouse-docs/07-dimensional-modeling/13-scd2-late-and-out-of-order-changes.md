# 13 — SCD2 Late and Out-of-Order Changes

**Content type: PROJECT IMPLEMENTATION.**

## The problem

Every SCD2 example so far assumed changes arrive in the correct
chronological order. Real systems don't guarantee this — a change event
timestamped `2024-01-01` might physically arrive and be processed
*after* one timestamped `2024-01-05`, especially across retries, network
delays, or backfills.

## Hands-On Walkthrough — reproduce a late-arriving change and watch it corrupt history if handled naively

1. Build a small, controlled SCD2 table from scratch to see this clearly:
   ```python
   spark.sql("DROP TABLE IF EXISTS catalog.gold.scd2_late_demo")
   spark.sql("""
       CREATE TABLE catalog.gold.scd2_late_demo (
           key BIGINT, id STRING, city STRING,
           valid_from TIMESTAMP, valid_to TIMESTAMP, is_current BOOLEAN
       ) USING iceberg
   """)
   spark.sql("""
       INSERT INTO catalog.gold.scd2_late_demo VALUES
       (1, 'X', 'CityA', TIMESTAMP '2024-01-05 00:00:00', NULL, true)
   """)
   ```
2. A late-arriving event claims the city was actually `CityB` starting
   `2024-01-01` — **earlier** than the current row's `valid_from`. Apply
   the naive Step-A/Step-B pattern from
   [`09-scd2-manual-merge.md`](09-scd2-manual-merge.md) blindly:
   ```python
   spark.sql("""
       UPDATE catalog.gold.scd2_late_demo
       SET valid_to = TIMESTAMP '2024-01-01 00:00:00', is_current = false
       WHERE id = 'X' AND is_current = true
   """)
   spark.sql("""
       INSERT INTO catalog.gold.scd2_late_demo VALUES
       (2, 'X', 'CityB', TIMESTAMP '2024-01-01 00:00:00', NULL, true)
   """)
   ```
3. Check the damage:
   ```sql
   SELECT * FROM iceberg.gold.scd2_late_demo WHERE id = 'X' ORDER BY valid_from;
   ```
   **Expected result**: row 1 now has `valid_from = 2024-01-05` **and**
   `valid_to = 2024-01-01` — an inverted, nonsensical window
   (`valid_from > valid_to`), and row 2 (`CityB`) is marked `is_current =
   true` even though row 1's `CityA` should still be current today. This
   is real, observable corruption from naively "expiring the current
   row" without checking whether the incoming event is actually newer.

## The fix: compare the incoming event's timestamp against the current row's `valid_from`, don't assume it's always newer

```python
spark.sql("DELETE FROM catalog.gold.scd2_late_demo WHERE key = 2")
spark.sql("""
    UPDATE catalog.gold.scd2_late_demo SET valid_to = NULL, is_current = true
    WHERE key = 1
""")  # reset to clean state, then apply correctly:
spark.sql("""
    INSERT INTO catalog.gold.scd2_late_demo
    SELECT 3, 'X', 'CityB', TIMESTAMP '2024-01-01 00:00:00', TIMESTAMP '2024-01-05 00:00:00', false
""")
```
Now `CityB` is correctly inserted as a **historical, already-superseded**
version (`valid_to` = the existing row's `valid_from`), not as the new
current row — the existing `CityA` row is untouched and remains current.
Verify:
```sql
SELECT * FROM iceberg.gold.scd2_late_demo WHERE id = 'X' ORDER BY valid_from;
```
**Expected result**: `CityB` (2024-01-01 to 2024-01-05), then `CityA`
(2024-01-05, still current) — correct, non-overlapping, chronologically
sane history, inserted "in the middle" rather than always appended at the
end.

> 🧪 **Checkpoint**: you reproduced a real inverted validity window from
> naive late-event handling, then fixed it by comparing timestamps
> instead of assuming every incoming event is the newest.

## Next document

[`14-scd2-fact-lookup-and-temporal-joins.md`](14-scd2-fact-lookup-and-temporal-joins.md).
