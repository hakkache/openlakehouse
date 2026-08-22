# 04 — Deduplication

**Content type: PROJECT IMPLEMENTATION.**

## Why dedup belongs in Silver, not Bronze

[`03-bronze-ingestion/04-raw-data-preservation.md`](../03-bronze-ingestion/04-raw-data-preservation.md)
established that Bronze never filters/dedupes. This project's actual Olist
CSVs are already dedup-clean at the primary-key grain, so this document
uses a **synthetic, intentionally-introduced duplicate** to demonstrate the
mechanism honestly, rather than pretending a real duplicate exists where
none does.

## Hands-On Walkthrough

1. In Jupyter (reusing `olist_bronze_ingestion.ipynb` or a new cell/notebook),
   append one duplicate `olist_sellers` row on purpose:
   ```python
   df = spark.table("catalog.bronze.olist_sellers")
   dup = df.limit(1)
   df.union(dup).writeTo("catalog.bronze.olist_sellers_dupe_demo").createOrReplace()
   print(spark.table("catalog.bronze.olist_sellers_dupe_demo").count())
   ```
   **Expected output**: `3096` (3095 real rows + 1 intentional duplicate).
2. In the Pipeline Builder, create pipeline `silver_sellers_dedup_demo`.
3. **Source node**: `schema = bronze`, `table = olist_sellers_dupe_demo`.
4. Add a **deduplicate** transform node, `columns = seller_id`.
5. Click **Compile**. **Expected result** (structure, not exact CTE names):
   ```sql
   SELECT * FROM (
     SELECT *, ROW_NUMBER() OVER (PARTITION BY seller_id ORDER BY seller_id) AS _rn
     FROM <predecessor>
   ) _dedup WHERE _rn = 1
   ```
6. Add destination `iceberg_silver` / `olist_sellers`, run it.
7. Verify:
   ```sql
   SELECT count(*) FROM iceberg.silver.olist_sellers;
   ```
   **Expected result**: `3095` — the duplicate is gone.

## The real limitation to understand here

The compiled `ROW_NUMBER() OVER (PARTITION BY seller_id ORDER BY seller_id)`
has **no real tiebreak column** — if two duplicate rows genuinely differed
in a non-key column (e.g. one had a typo'd `seller_city`), this dedup keeps
an *arbitrary* one of them, not necessarily the "correct"/latest one. A
production dedup needs an explicit recency column (e.g. an ingestion
timestamp or Kafka offset) in the `ORDER BY` — covered in
[`08-advanced-data-engineering/05-duplicate-events.md`](../08-advanced-data-engineering/05-duplicate-events.md).

> 🧪 **Checkpoint**: you introduced a real duplicate, watched it survive
> into a `SELECT count(*)`, then watched the `deduplicate` node remove it
> — proof the node does real work, not just a claim.

## Next document

[`05-null-handling.md`](05-null-handling.md).
