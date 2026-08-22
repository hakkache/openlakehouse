# 03 — Schema Inference: Where the Shortcut Stops Being Safe

**Content type: PROJECT IMPLEMENTATION + CURRENT PLATFORM CAPABILITY.**

## Why `inferSchema=True` was used in Bronze

`spark.read.option("inferSchema", True).csv(...)` makes Spark scan a
sample of the file to guess each column's type (integer, double, string,
timestamp) instead of you declaring a schema by hand. This is a reasonable
**Bronze-layer-only** shortcut: Bronze's job is to preserve raw data as
faithfully and cheaply as possible, and Spark's CSV type inference is
good enough for this dataset's numeric/timestamp-shaped columns.

## Where it stops being safe

**Do not rely on inferred types past Bronze.** Two concrete failure modes:

1. **A column that looks numeric but isn't an identifier.**
   `customer_zip_code_prefix` infers as an `integer` — but a zip code is
   an identifier, not a quantity (you'll never `SUM()` a zip code, and a
   leading-zero zip like `01310` silently becomes `1310` as an integer).
   Silver explicitly re-casts this to `varchar` — see
   [`04-silver-transformation/03-type-casting.md`](../04-silver-transformation/03-type-casting.md).
2. **A column Spark infers as `string` when it's really a timestamp on a
   different run.** Type inference samples the data — if a very small
   fraction of rows have malformed timestamp strings, Spark may fall back
   to inferring the whole column as `string` instead of `timestamp`,
   silently changing your Bronze schema between runs on different data.

## Hands-On Walkthrough — see the exact inferred types right now

1. In your `olist_bronze_ingestion.ipynb` notebook (from
   [`02-jupyter-pyspark-ingestion.md`](02-jupyter-pyspark-ingestion.md)),
   add a new cell:
   ```python
   spark.table("catalog.bronze.olist_orders").printSchema()
   ```
   Run it. **Expected output**: a schema tree showing
   `order_purchase_timestamp: timestamp`,
   `order_approved_at: timestamp`, etc. — Spark correctly inferred these
   as timestamps because Olist's raw format is already
   `YYYY-MM-DD HH:MM:SS` (not ISO-8601 `T`/`Z` — a format Trino's `CAST`
   handles natively, see the callout below).
2. Add another cell:
   ```python
   spark.table("catalog.bronze.olist_customers").printSchema()
   ```
   **Expected output**: `customer_zip_code_prefix: integer` — confirming
   the exact problem described above. This is intentional at the Bronze
   layer (preserve what Spark saw) and intentionally fixed in Silver.
3. Open **SQL Editor** (`http://localhost/sql`) and run:
   ```sql
   DESCRIBE iceberg.bronze.olist_customers;
   ```
   **Expected result**: the same schema, now confirmed from Trino's side
   too — proof both engines agree on the one real schema (Polaris is the
   single source of truth for both).

## Callout: the ISO-8601 timestamp gotcha (documented so you recognize it later)

Trino's `CAST(x AS timestamp)` fails on ISO-8601 `T`/`Z`-formatted strings
(e.g. `2017-01-01T10:00:00Z`) — you'd need
`from_iso8601_timestamp(x)` instead. Olist's raw CSVs are already
`YYYY-MM-DD HH:MM:SS`, so a plain `CAST` works directly and you will not
hit this in this project's Silver layer. You *will* need
`from_iso8601_timestamp()` if you ever ingest an API response with
ISO-8601 timestamps (e.g. the optional streaming/API-ingestion exercises
in [`08-advanced-data-engineering/`](../08-advanced-data-engineering/)) —
called out here so the gotcha is on your radar before you need it.

> 🧪 **Checkpoint**: you've now seen, with your own two engines (Spark's
> `printSchema()` and Trino's `DESCRIBE`), exactly which Bronze columns
> will need re-typing in Silver, and why `customer_zip_code_prefix` is the
> canonical example in this project.

## Next document

[`04-raw-data-preservation.md`](04-raw-data-preservation.md).
