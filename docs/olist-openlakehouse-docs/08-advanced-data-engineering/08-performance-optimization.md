# 08 — Performance Optimization

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — measure, don't guess

1. Baseline a real query's cost:
   ```sql
   EXPLAIN ANALYZE
   SELECT d.customer_state, count(*) , sum(f.total_order_value)
   FROM iceberg.gold.fact_orders f
   JOIN iceberg.gold.dim_customers d ON f.customer_key = d.customer_key
   GROUP BY d.customer_state;
   ```
   **Expected result**: real wall-clock time and scanned-bytes numbers in
   the plan output — note them down as your baseline.

## Optimization 1 — file compaction (recap from doc 07, applied here)

2. Run `ALTER TABLE iceberg.gold.fact_orders EXECUTE optimize;` and
   re-run the query. **Expected result**: equal or faster wall-clock time
   — compaction reduces file-open overhead, most visible on tables with
   many small files (less dramatic on this project's already-consolidated
   tables, but the mechanism is the same one that matters a lot at real
   production scale).

## Optimization 2 — Iceberg metadata table for query planning insight

3. Inspect partition-level statistics directly:
   ```sql
   SELECT * FROM iceberg.gold."fact_orders$partitions" LIMIT 5;
   ```
   **Expected result**: real per-partition row counts and file sizes —
   use this to spot skewed partitions (one partition wildly larger than
   others) before they become a real bottleneck.

## Optimization 3 — column projection and predicate pushdown (verify Trino actually does this)

4. Compare scanned bytes for a wide vs. narrow `SELECT`:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM iceberg.gold.fact_orders WHERE order_id = 'zz_new_order_1';
   EXPLAIN ANALYZE SELECT order_id FROM iceberg.gold.fact_orders WHERE order_id = 'zz_new_order_1';
   ```
   **Expected result**: the narrower `SELECT order_id`-only query reports
   fewer scanned bytes than `SELECT *` — real column-projection pushdown,
   confirmed with your own numbers, not just claimed.

## Optimization 4 — sort order for range queries

5. Compare `EXPLAIN ANALYZE` for a `purchase_date_key` range filter
   against the sorted-on-write `fact_orders_partitioned` table (doc 07)
   vs. the original `fact_orders`. **Expected result**: the partitioned
   version shows a smaller scanned footprint for the same date-range
   filter — direct proof that choosing a partition/sort column aligned
   with your actual query patterns has a real, measurable effect.

> 🧪 **Checkpoint**: you have 4 real `EXPLAIN ANALYZE` before/after
> comparisons, each showing a genuine, numeric improvement from a specific
> optimization technique.

## Next document

[`09-metadata-driven-and-parameterized-pipelines.md`](09-metadata-driven-and-parameterized-pipelines.md).
