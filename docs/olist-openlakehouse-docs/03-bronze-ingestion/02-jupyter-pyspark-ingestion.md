# 02 — Jupyter + PySpark Ingestion (Full Hands-On Walkthrough)

**Content type: PROJECT IMPLEMENTATION.** Every step below is literal —
exact URL, exact button, exact code, exact expected result. Follow it in
order against your own running stack.

## Prerequisites

- Stack is up: `docker compose --profile full up -d --build`, and
  `docker compose ps` shows everything `Up`/`healthy` (first boot can take
  several minutes).
- The 9 Olist CSVs are on your machine, in one folder.
- You've read [`01-ingestion-architecture.md`](01-ingestion-architecture.md)
  (why Jupyter, not the Pipeline Builder, for this step).

## Step 1 — Open Jupyter

Navigate to:

```
http://localhost:8888/jupyter/?token=openlakehouse
```

You should land on the Jupyter file browser (JupyterLab), token
pre-filled via the URL. If you instead see a login prompt asking for a
token, paste `openlakehouse` and press Enter.

## Step 2 — Upload the 9 CSV files

1. In the file browser's left panel, click the **Upload** button (an
   up-arrow icon in the toolbar above the file list).
2. In the file picker dialog, select all 9 files at once:
   `olist_customers_dataset.csv`, `olist_orders_dataset.csv`,
   `olist_order_items_dataset.csv`, `olist_order_payments_dataset.csv`,
   `olist_order_reviews_dataset.csv`, `olist_products_dataset.csv`,
   `olist_sellers_dataset.csv`, `olist_geolocation_dataset.csv`,
   `product_category_name_translation.csv`.
3. Click **Open**/**Upload** to confirm. Each file appears in the file
   browser with a small blue **Upload** confirmation button next to it if
   JupyterLab staged it — click that too if present (some JupyterLab
   versions require a second click to finalize each large file).
4. Wait until all 9 files show a normal (non-greyed) file icon — the
   `olist_geolocation_dataset.csv` file is the largest (~1M rows) and may
   take the longest to finish uploading.

**Expected result**: all 9 `.csv` files listed in the Jupyter file browser
root directory, sizes roughly: customers ~9MB, orders ~17MB, order_items
~15MB, payments ~6MB, reviews ~14MB, products ~2MB, sellers ~175KB,
geolocation ~61MB, category_translation ~2KB.

## Step 3 — Create the ingestion notebook

1. In the file browser, click **File → New → Notebook**.
2. When prompted for a kernel, choose **Python 3 (ipykernel)**.
3. Rename the notebook (click the title at the top, currently
   `Untitled.ipynb`) to `olist_bronze_ingestion.ipynb` — this makes it easy
   to find again later and matches the naming convention used by this
   project's other notebooks.

## Step 4 — Cell 1: start a Spark session

In the first cell, paste:

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("olist-ingest").getOrCreate()
spark.sql("CREATE NAMESPACE IF NOT EXISTS catalog.bronze")
print(spark.version)
```

Run it (Shift+Enter). **Expected result**: a Spark version string prints
(no errors). This connects to the shared Spark cluster (`spark-master` +
`spark-worker` containers) and creates the `bronze` namespace in the
`catalog` (Spark's alias for the Polaris/Iceberg warehouse) if it doesn't
already exist — safe to re-run, `CREATE NAMESPACE IF NOT EXISTS` is a
no-op on a second run.

> If this cell hangs for more than ~30 seconds or errors with a
> connection-refused message, `spark-master`/`spark-worker` are probably
> still starting — check `docker compose ps` in a terminal and wait for
> both to show `healthy`.

## Step 5 — Cell 2: ingest all 9 tables in one loop

```python
files = {
    "olist_customers":  "olist_customers_dataset.csv",
    "olist_orders":     "olist_orders_dataset.csv",
    "olist_order_items":"olist_order_items_dataset.csv",
    "olist_payments":   "olist_order_payments_dataset.csv",
    "olist_reviews":    "olist_order_reviews_dataset.csv",
    "olist_products":   "olist_products_dataset.csv",
    "olist_sellers":     "olist_sellers_dataset.csv",
    "olist_geolocation":"olist_geolocation_dataset.csv",
    "category_translation": "product_category_name_translation.csv",
}

for table, path in files.items():
    df = spark.read.option("header", True).option("inferSchema", True).csv(path)
    df.writeTo(f"catalog.bronze.{table}").createOrReplace()
    print(f"{table}: {df.count()} rows")
```

Run it. This cell takes the longest of the notebook (the geolocation file
alone is ~1M rows) — expect it to run for one to several minutes depending
on your machine's Docker resource allocation.

**Expected output** (one line per table, in this order):

```
olist_customers: 99441 rows
olist_orders: 99441 rows
olist_order_items: 112650 rows
olist_payments: 103886 rows
olist_reviews: 104162 rows
olist_products: 32951 rows
olist_sellers: 3095 rows
olist_geolocation: 1000163 rows
category_translation: 71 rows
```

> 🧪 **If any number doesn't match**: stop here. A mismatch almost always
> means either a partial/corrupted CSV download or an upload that didn't
> finish (Step 2). Re-download or re-upload the specific mismatched file
> and re-run Cell 2 only for that table (or the whole cell — it's
> idempotent via `createOrReplace()`, see
> [`06-idempotency.md`](06-idempotency.md)).

## Step 6 — Verify in the app (not just in the notebook)

This is the step that proves the data really landed in the shared
lakehouse — not just in Spark's local session memory.

1. Open a browser to `http://localhost` and log in
   (`admin.user` / `openlakehouse`).
2. Navigate to **Catalog** (left nav, under the "Explore" group, or go
   directly to `http://localhost/catalog`).
3. In the catalog tree, expand **iceberg** → **bronze**. **Expected
   result**: all 9 tables listed (`olist_customers`, `olist_orders`,
   `olist_order_items`, `olist_payments`, `olist_reviews`,
   `olist_products`, `olist_sellers`, `olist_geolocation`,
   `category_translation`).
4. Click on `olist_orders` in the tree. **Expected result**: the column
   list appears (`order_id`, `customer_id`, `order_status`,
   `order_purchase_timestamp`, ...), along with Iceberg metadata
   (snapshot history, current schema).
5. Navigate to **Data Explorer** (`http://localhost/explorer`), expand the
   same tree, click `olist_orders`, and click the preview action.
   **Expected result**: a 100-row sample table renders with real data —
   visually confirms actual row contents, not just a row count.
6. Navigate to **SQL Editor** (`http://localhost/sql`) and run:
   ```sql
   SELECT count(*) FROM iceberg.bronze.olist_orders;
   ```
   **Expected result**: `99441` — the same number Cell 2 printed, now
   confirmed through a completely different engine (Trino, not Spark),
   proving the write is durable and cross-engine-visible, not a
   Spark-session-local artifact.

> 🧪 **Checkpoint for this document**: steps 5 and 6 above both return
> real data matching Cell 2's printed counts. This is the same checkpoint
> the original guide's Chapter 3 specifies — now made fully explicit with
> every click named.

## What you just proved, architecturally

- Spark's `catalog.bronze.*` write and Trino's `iceberg.bronze.*` read are
  the *same* physical Iceberg table (Polaris tracks one set of metadata,
  both engines read it).
- The write is durable in MinIO object storage, not held in any
  container's memory — you could restart every container right now and
  the data would still be there (feel free to verify this by running
  `docker compose restart trino` and re-running the SQL Editor query).

## Next document

[`03-schema-inference.md`](03-schema-inference.md) — why `inferSchema=True`
was safe to use here, and exactly where that shortcut stops being safe.
