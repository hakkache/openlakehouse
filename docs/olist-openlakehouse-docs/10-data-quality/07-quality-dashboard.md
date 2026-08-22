# 07 — Quality Dashboard

**Content type: PROJECT IMPLEMENTATION.** Consolidates every check built
in this module into one Gold table and one Superset dashboard (full
Superset mechanics in module 12 — this document builds the underlying
data, module 12 builds the visualization).

## Hands-On Walkthrough — a single `gold.quality_check_results` table

1. In Jupyter, materialize every check from this module's documents 02-06
   into one unified results table:
   ```python
   from pyspark.sql import Row
   results = [
       Row(check_name="orders_pk_unique", passed=True, violations=0),
       Row(check_name="reviews_pk_unique", passed=True, violations=0),  # update after your dedup fix from doc 02
       Row(check_name="fact_orders_no_orphan_customers", passed=True, violations=0),
       Row(check_name="fact_orders_total_matches_items", passed=True, violations=0),
   ]
   spark.createDataFrame(results).withColumn("checked_at", spark.sql("SELECT current_timestamp()").first()[0]) \
       .writeTo("catalog.gold.quality_check_results").createOrReplace()
   ```
   (populate the real `violations` counts by actually re-running each
   check query from documents 02-06 and substituting the real numbers,
   rather than hardcoding `0`/`True` blindly).
2. Verify: `SELECT * FROM iceberg.gold.quality_check_results;`
   **Expected result**: 4 rows, each reflecting a genuinely re-verified
   check result from this module.
3. This table is now ready to be a Superset dataset — build the actual
   dashboard visualization in
   [`12-bi-and-analytics/`](../12-bi-and-analytics/) once you reach that
   module; this document's job was only to produce real, queryable
   quality data to visualize.

> 🧪 **Checkpoint**: `gold.quality_check_results` contains real,
> independently-verified pass/fail data for every check built in this
> module — not placeholder rows.

## Next document

[`08-quality-failure-scenarios.md`](08-quality-failure-scenarios.md).
