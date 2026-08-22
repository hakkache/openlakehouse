# 05 — Freshness

**Content type: PROJECT IMPLEMENTATION.**

## Two different meanings of "freshness" in this project (both real)

1. **Historical-data freshness** (this dataset): "is the data as complete
   as the source ever will be" — Olist's data is fixed/historical, so
   this really means "did the last ingestion run actually complete
   successfully," not "is the data from the last few minutes."
2. **Streaming freshness** (module 14): "how recent is the latest event,"
   a genuinely time-sensitive check for the Kafka/CDC pipelines.

## Hands-On Walkthrough — build the right freshness check for each case

1. For historical Olist tables, the meaningful "freshness" check is
   **last successful run timestamp**, not event recency:
   ```sql
   SELECT table_name, max(committed_at) AS last_run
   FROM (
     SELECT 'olist_orders' AS table_name, committed_at FROM iceberg.silver."olist_orders$snapshots"
     UNION ALL
     SELECT 'olist_customers', committed_at FROM iceberg.silver."olist_customers$snapshots"
   )
   GROUP BY table_name;
   ```
   **Expected result**: real timestamps matching when you last ran each
   Silver pipeline — this is the metric to alert on if a scheduled run
   (module 09) silently stops firing, not the underlying event
   timestamps.
2. For the streaming source (once built in module 14), the `freshness`
   quality node from
   [`04-silver-transformation/07-data-quality-gates.md`](../04-silver-transformation/07-data-quality-gates.md)
   with a genuinely small `max_age_minutes` (e.g. `60`) is the right tool
   — revisit that document's callout about why a small threshold is wrong
   for this historical Olist data but correct for a live stream.

> 🧪 **Checkpoint**: you can state, precisely, why "the last snapshot
> commit time" is the correct freshness signal for this project's
> historical tables, while "event age" is the correct signal for a future
> streaming source — and why using the wrong one for either would produce
> a meaningless or perpetually-failing check.

## Next document

[`06-business-rules.md`](06-business-rules.md).
