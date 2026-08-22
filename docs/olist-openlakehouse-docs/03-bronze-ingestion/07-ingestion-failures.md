# 07 — Ingestion Failure Scenarios (Negative Testing)

**Content type: PROJECT IMPLEMENTATION.** Every scenario below is something
you actually do to your own notebook/data on purpose, then observe and fix
— not a hypothetical.

## Scenario A — Jupyter kernel dies mid-run

**Break it**: while Cell 2 is ingesting `olist_geolocation` (the largest
file, ~1M rows), click **Kernel → Restart Kernel...** in the Jupyter menu
and confirm.

**What happens**: the cell's Python process is killed; any tables written
*before* `olist_geolocation` in the loop (customers, orders, order_items,
payments, reviews, products, sellers) are already durably committed in
Iceberg (each `createOrReplace()` call is its own transaction) —
`olist_geolocation` and `category_translation` (whichever hadn't started
yet) are simply missing.

**Detect it**: run
```sql
SELECT count(*) FROM iceberg.bronze.olist_geolocation;
```
— either an error ("table not found", if this was the very first run) or
a suspiciously low/zero count.

**Fix it**: re-run Cell 1 (recreate the Spark session) then Cell 2 (the
whole loop is idempotent per [`06-idempotency.md`](06-idempotency.md), so
re-running it is always safe — it will just redo the already-successful
tables too, at no cost beyond time).

**Prevention**: for very large files on constrained hardware, ingest one
table per cell instead of one loop, so a kernel restart only costs you
the table that was in flight, and you know exactly which one to re-run.

## Scenario B — Uploading a file that never finishes

**Break it**: start uploading `olist_geolocation_dataset.csv` (Step 2 of
[`02-jupyter-pyspark-ingestion.md`](02-jupyter-pyspark-ingestion.md)) and
immediately navigate away from the Jupyter tab before it completes.

**What happens**: JupyterLab either shows the file as 0 bytes or fails
the upload silently.

**Detect it**: back in the notebook, `spark.read.csv("olist_geolocation_dataset.csv")`
either errors (`Path does not exist`) or `df.count()` returns `0`/a wrong
number.

**Fix it**: re-upload the file completely, watch the upload progress
indicator to completion this time, then re-run just that table's cell.

## Scenario C — Wrong file uploaded (column mismatch)

**Break it**: rename any other CSV to `olist_sellers_dataset.csv` on your
machine and upload it in place of the real file (a deliberate, safe way to
simulate "wrong file" without needing real corrupted data).

**What happens**: `spark.read.option("header", True)...csv(...)` still
succeeds (Spark doesn't know what a "sellers" file should look like) — but
`df.writeTo("catalog.bronze.olist_sellers").createOrReplace()` writes
whatever columns the wrong file actually has, silently poisoning the
Bronze table's schema.

**Detect it**: `spark.table("catalog.bronze.olist_sellers").printSchema()`
shows the wrong columns (e.g. `product_id` instead of `seller_id`) —
compare against the expected column list in
[`02-source-and-data-model/01-olist-dataset.md`](../02-source-and-data-model/01-olist-dataset.md).

**Fix it**: re-upload the correct file, re-run that table's ingestion
cell (`createOrReplace()` fully overwrites the wrong schema — no manual
`DROP TABLE` needed first).

**Real-world lesson**: this is why
[`08-bronze-testing.md`](08-bronze-testing.md) recommends a schema
assertion immediately after ingestion, not just a row-count check — a row
count can look "plausible" even when every column is wrong.

## Scenario D — Row count doesn't match the expected value

**Break it**: you don't need to break anything artificially here — this
is a real, documented gotcha in this exact dataset. Run:
```python
with open("olist_order_reviews_dataset.csv", encoding="utf-8") as f:
    print(sum(1 for _ in f) - 1)   # naive "line count minus header"
```
vs.
```python
spark.read.option("header", True).csv("olist_order_reviews_dataset.csv").count()
```

**What happens**: the naive line-count number is *higher* than Spark's
real count by a couple of rows.

**Root cause**: a few `review_comment_message` values contain embedded
newlines inside quoted CSV fields — a naive `(line count) - 1` estimate
counts each embedded newline as a new "row" that isn't actually one.
Spark's real CSV parser correctly handles quoted multi-line fields.

**Lesson**: trust Spark's `.count()` (a real CSV-aware parse), never a
naive `wc -l`/line-count shortcut, when validating row counts for any file
that might contain free-text fields.

## Full failure-scenario summary table

| Scenario | Detection signal | Fix |
|---|---|---|
| A — kernel dies mid-loop | missing/short table | re-run Cells 1–2 (idempotent) |
| B — upload never finished | 0 rows or path-not-found | re-upload fully, re-run that table |
| C — wrong file uploaded | schema mismatch on `printSchema()` | re-upload correct file, re-run |
| D — naive line-count mismatch | count differs from Spark's real parse | trust Spark's `.count()`, not `wc -l` |

## Next document

[`08-bronze-testing.md`](08-bronze-testing.md).
