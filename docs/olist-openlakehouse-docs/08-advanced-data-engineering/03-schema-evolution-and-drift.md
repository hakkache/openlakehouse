# 03 — Schema Evolution and Drift

**Content type: PROJECT IMPLEMENTATION + CURRENT PLATFORM CAPABILITY.**

## Iceberg's real schema evolution support

Apache Iceberg tables (every table in this project) support adding,
dropping, renaming, and widening columns **without rewriting existing
data files** — a genuine advantage of the table format used platform-wide.

## Hands-On Walkthrough — add a column to a real table with zero downtime

1. In Jupyter:
   ```python
   spark.sql("ALTER TABLE catalog.gold.dim_sellers ADD COLUMN seller_notes STRING")
   ```
2. Verify immediately in **SQL Editor** (no rebuild needed):
   ```sql
   SELECT seller_id, seller_notes FROM iceberg.gold.dim_sellers LIMIT 3;
   ```
   **Expected result**: 3 rows, `seller_notes` is `NULL` for all of them
   — the column exists platform-wide instantly, with old data files
   untouched (Iceberg tracks this as a schema change in metadata, not a
   physical rewrite).
3. Now widen a numeric type safely:
   ```python
   spark.sql("ALTER TABLE catalog.gold.fact_order_items ALTER COLUMN price TYPE decimal(12,2)")
   ```
   **Expected result**: succeeds — widening `decimal(10,2)` →
   `decimal(12,2)` is a safe evolution (more digits, same scale).
4. **Negative test — an unsafe evolution**: try narrowing it back:
   ```python
   spark.sql("ALTER TABLE catalog.gold.fact_order_items ALTER COLUMN price TYPE decimal(8,2)")
   ```
   **Expected result**: a real error — Iceberg blocks type changes that
   could lose precision/data, a genuine safety guarantee, not a gap.

## Schema drift: when the *source* changes shape unexpectedly

Unlike Iceberg's controlled `ALTER TABLE` above, schema **drift** is when
an upstream source (a future CSV export, an API response) silently adds/
renames/removes a column *without you asking it to*. Detect this by
comparing `DESCRIBE` output against a saved expected-schema snapshot
before each ingestion run — see
[`10-data-quality/03-validity-and-schema.md`](../10-data-quality/03-validity-and-schema.md)
for a concrete drift-detection check built as a Pipeline Builder quality
gate.

> 🧪 **Checkpoint**: you added and widened a real column with zero
> downtime, and confirmed Iceberg genuinely blocks an unsafe narrowing
> change rather than silently truncating data.

## Next document

[`04-late-arriving-data.md`](04-late-arriving-data.md).
