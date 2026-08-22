# Guided Project: Build a Customer Orders Lakehouse

This is a hands-on, end-to-end walkthrough you run yourself on top of OpenLakehouse.
Every step maps to something real: a real file, a real button in the UI, a real
Spark/Trino job. Nothing here is simulated. By the end you'll have taken one CSV
file all the way through: raw data → Bronze → Silver → Gold Iceberg tables → a
data quality gate → a lineage graph → SQL analytics → orchestration → a BI
dashboard → a tracked ML model → version control → monitoring.

Estimated scope: a single afternoon.

## 0. Prerequisites

Start (or confirm) the full stack is up:

```powershell
docker compose --profile full up -d --build
docker compose ps
```

Wait until everything shows `Up`/`healthy` (the first boot pulls large images and
can take several minutes — `ollama` and `openmetadata` are the slowest).

**Access points and credentials you'll need for this walkthrough:**

| Service | URL | Login |
|---|---|---|
| OpenLakehouse app | http://localhost | `engineer.user` / `openlakehouse` (or `admin.user` / `openlakehouse` for full access) |
| Jupyter | http://localhost:8888/jupyter/?token=openlakehouse | token: `openlakehouse` |
| Apache Superset | http://localhost:8088 | `admin` / `openlakehouse_dev_password` |
| MLflow | http://localhost:5000 | no auth |
| Dagster | http://localhost:3001 | no auth |
| Gitea | http://localhost:3010 | `olh-admin` / `openlakehouse_dev_password` |
| Grafana | http://localhost:3300 | `admin` / `openlakehouse_dev_password` |

> Always browse the OpenLakehouse app itself via **http://localhost** (port 80,
> through Traefik) — the frontend's own dev port does not proxy `/api` requests
> and will fail with 405 errors on anything that writes data.

## 1. Get the sample data

A ready-made 30-row CSV is included at
[docs/guided_project/sample_orders.csv](docs/guided_project/sample_orders.csv)
— 10 customers (`cust-1` … `cust-10`), each with a few orders:

```csv
order_id,customer_id,amount,status,created_at
ORD-1001,cust-1,120.50,PAID,2026-06-01 09:15:00
ORD-1002,cust-1,45.00,SHIPPED,2026-06-03 14:22:00
...
```

Columns: `order_id` (text, unique), `customer_id` (text), `amount` (decimal),
`status` (`PENDING`/`PAID`/`SHIPPED`/`CANCELLED`), `created_at` (timestamp,
deliberately formatted as `YYYY-MM-DD HH:MM:SS` rather than ISO-8601-with-`T`/`Z`
— Trino's `CAST(x AS timestamp)` can't parse the latter directly, see the callout
in step 4).

## 2. Load it into the Bronze layer via Jupyter

The No-Code Builder can only read data that's *already* an Iceberg table (its
source node type is `iceberg_table` only — raw CSV/MinIO/Kafka sources aren't
wired into the compiler yet), so the first hop from "a CSV on your laptop" to
"a real table in the lakehouse" goes through a PySpark notebook.

1. Open Jupyter: http://localhost:8888/jupyter/?token=openlakehouse
2. In the file browser (left sidebar), use the **Upload** button to upload
   `docs/guided_project/sample_orders.csv` from your machine.
3. **File → New → Notebook**, choose the **Python 3** kernel.
4. Paste and run this in the first cell:

   ```python
   from pyspark.sql import SparkSession

   spark = SparkSession.builder.appName("guided-project-ingest").getOrCreate()

   pdf = __import__("pandas").read_csv("sample_orders.csv")
   df = spark.createDataFrame(pdf)

   spark.sql("CREATE NAMESPACE IF NOT EXISTS catalog.bronze")
   df.writeTo("catalog.bronze.orders_raw").createOrReplace()

   print("rows written:", spark.table("catalog.bronze.orders_raw").count())
   df.printSchema()
   ```

   You should see `rows written: 30`. (Spark's catalog alias for the shared
   Iceberg/Polaris warehouse is `catalog`; Trino's alias for the *same*
   warehouse is `iceberg` — same tables, two different engine-local names.)

5. **Verify** in the app: open **Catalog** (`/catalog`) → expand `iceberg` →
   `bronze` → `orders_raw`, and confirm the 5 columns are there. **Data
   Explorer** (`/explorer`) gives you the same Catalog → Schema → Table →
   Columns tree plus a click-to-preview 100-row sample, in one page.

## 3. Build the Bronze → Silver pipeline (No-Code Builder)

Open **No-Code Builder** (`/pipelines`). The builder has a searchable node
palette on the left (grouped by kind — source/transform/quality/destination,
each button with a one-line description tooltip), a canvas in the middle, and
a config panel on the right that opens when you click a node. Every node type
used in this walkthrough gets **labeled form fields** — text/number inputs,
dropdowns, comma-separated list fields, and key→value row editors for
dict-style config like `casts`/`aggregations` — instead of raw JSON. The
`iceberg_table` source's **Schema**/**Table** fields are live dropdowns
populated from the real Trino catalog, so you never have to hand-type a
schema/table name. Whatever you enter still compiles down to the same JSON
shown in the tables below; you can inspect or hand-edit it anytime via the
collapsed **Advanced: raw JSON** section at the bottom of the panel (only
needed for the handful of types with no structured form yet, e.g.
`minio`/`postgresql`/`kafka` destinations and the `schema` quality check).

> The palette's top bar also has a pipeline search box and **New**/**Duplicate**/
> **Delete** buttons for managing saved pipelines, and each node's panel shows
> its node ID with a **Copy ID** button — handy when writing `window`/`filter`
> expressions that reference another node's output columns. Select a node and
> press **Delete**/**Backspace** to remove it (with a confirmation prompt).
> On the canvas, each node is rendered as a colored card with its own icon —
> blue for sources, emerald for transforms, amber for quality checks, violet
> for destinations — so you can read the shape of a pipeline at a glance
> without opening every node.

1. Name the pipeline: type `bronze_to_silver_orders` in the name box at the top.
2. Add these 6 nodes (click the matching button under each kind heading — use
   the node search box if the palette list gets long), then click each node
   and fill in its form fields (the equivalent JSON is shown for reference):

   | # | Kind | Type | Config JSON |
   |---|---|---|---|
   | A | source | `iceberg_table` | `{"schema": "bronze", "table": "orders_raw"}` |
   | B | transform | `cast` | `{"casts": {"amount": "double", "created_at": "timestamp"}, "keep": ["order_id", "customer_id", "status"]}` |
   | C | transform | `deduplicate` | `{"columns": ["order_id"]}` |
   | D | quality | `not_null` | `{"columns": ["order_id", "customer_id", "amount"]}` |
   | E | quality | `unique` | `{"columns": ["order_id"]}` |
   | F | destination | `iceberg_silver` | `{"table": "orders_clean"}` |

3. Connect them in a straight chain **A → B → C → D → E → F**: hover the right
   edge of a node until a small connection handle appears, then drag it to the
   left edge of the next node.
4. Click **Save**, then **View Compiled SQL** to sanity-check the generated
   `WITH ... CREATE TABLE IF NOT EXISTS iceberg.silver.orders_clean AS ...`
   statement, then click **Run**.
5. Watch the status badge go `RUNNING` → `SUCCESS` (polls every ~1.5s). Each
   node also glows green on the canvas when it finishes.

> **Gotcha:** the destination SQL is `CREATE TABLE IF NOT EXISTS ... AS SELECT`.
> If you re-run this pipeline later, it will **not** refresh `orders_clean` since
> the table already exists — `IF NOT EXISTS` makes reruns a no-op. To rebuild,
> drop the table first from the **SQL** page: `DROP TABLE iceberg.silver.orders_clean`.

## 4. Build the Silver → Gold pipeline (aggregation)

Add a second pipeline, `silver_to_gold_revenue`, with 3 nodes chained **A → B → C**:

| # | Kind | Type | Config JSON |
|---|---|---|---|
| A | source | `iceberg_table` | `{"schema": "silver", "table": "orders_clean"}` |
| B | transform | `aggregate` | `{"group_by": ["customer_id"], "aggregations": {"amount": "sum", "order_id": "count"}}` |
| C | destination | `iceberg_gold` | `{"table": "customer_revenue"}` |

Save and **Run**. The aggregate node names its output columns
`<column>_<func>`, so `iceberg.gold.customer_revenue` ends up with columns
`customer_id`, `amount_sum`, `order_id_count`.

**Verify:** **Catalog** (`/catalog`) → `iceberg` → `silver` → `orders_clean`
(30 rows) and `iceberg` → `gold` → `customer_revenue` (10 rows, one per customer).

## 5. Check the data quality gate

Open **Data Quality** (`/quality`). You should see the `not_null` and `unique`
checks from the `bronze_to_silver_orders` run scored as passing (0 violations),
contributing to the overall quality score alongside the platform's own demo
pipelines' checks.

*Optional — see a real failure:* in Jupyter, append a row with a duplicate
`order_id` to the bronze table (`df.limit(1).writeTo("catalog.bronze.orders_raw").append()`),
re-run `bronze_to_silver_orders`. The `unique` node will report a violation,
the run status flips to `FAILED`, and the destination node is **skipped**
(quality failures block downstream writes) — visible both on the canvas and
in the Data Quality history.

## 6. Query it with SQL

Open **SQL** (`/sql`) and run:

```sql
SELECT customer_id, amount_sum AS total_spend, order_id_count AS orders
FROM iceberg.gold.customer_revenue
ORDER BY total_spend DESC
LIMIT 20;
```

Check **Recent history** afterwards to see the query logged.

> You can run the exact same query from **Data Explorer** (`/explorer`)
> instead: it has its own SQL editor with the same run/cancel/results flow,
> plus the catalog tree on the left and a Trino/Spark engine toggle if you
> want to try running it against the Spark Thrift Server (use the `catalog`
> alias instead of `iceberg` when Spark is selected — see the callout in
> step 2). **Right-click** any catalog/schema/table/column in that tree for
> quick actions (preview 100 rows, copy name, copy fully-qualified name,
> copy a ready-to-run `SELECT`, or run a live row count) — a toast confirms
> each clipboard copy. There's also a **PySpark Code** mode next to the SQL
> editor toggle that runs real, hand-written PySpark against a shared
> `SparkSession` (ADMIN/DATA_ENGINEER only) if you'd rather explore the data
> with a few lines of code instead of SQL.

## 7. Check lineage

Open **Lineage** (`/lineage`). Lineage is derived automatically from every saved
pipeline's source/destination nodes, so you should see:
`bronze.orders_raw → silver.orders_clean → gold.customer_revenue`, matching the
two pipelines you just built.

## 8. Orchestrate it with Dagster

Every pipeline you save is runnable from Dagster too — it calls the exact same
execution function the API uses, just out-of-process, and it's all driven from
the OpenLakehouse **Jobs** page (`/jobs`) — no need to touch the Dagster UI
directly or paste UUIDs into a launchpad.

Open **Jobs**. You'll see two sections:

- **Scheduled Pipelines** — any pipeline with a schedule set (see below) shows
  up here with a plain-English description of the schedule (e.g. "Runs daily
  at 03:00 UTC.") plus its computed next-run time, shown both as an absolute
  timestamp and a relative countdown ("in 10h"). A background Dagster sensor
  checks every 30 seconds and automatically launches a real run for each
  pipeline whose schedule fires — no manual "turn on the schedule" step
  needed.
- **Other Pipelines** — every pipeline without a schedule, each with a **Run
  now** button for one-off manual triggers.

Click **Run now** next to `bronze_to_silver_orders` (or any pipeline). You'll
see a "Run launched" confirmation, and within a few seconds the run appears in
**Recent Runs** below with its real pipeline name, live status
(`QUEUED` → `SUCCESS`/`FAILURE`), and relative start/end times ("14m ago") —
the same Trino/Iceberg write as clicking Run in the Pipeline Builder, just
orchestrated by Dagster. While a run is in progress, a **Cancel** button lets
you terminate it early. Once a run has a Dagster op actually executing, click
**View progress** to expand a live, step-by-step breakdown of every node in
the pipeline — status, row count, and duration — the same detail you'd get
watching the canvas in the Pipeline Builder, but for scheduled/Dagster-
triggered runs too.

Prefer to schedule it instead? Go back to **Pipelines**, open
`bronze_to_silver_orders`, expand **Pipeline settings**, and use the
**Schedule** dropdown — pick **Every 15 minutes**, **Hourly**, **Daily** (with
a time picker), or **Weekly** (with a day + time picker), and a live summary
line confirms exactly what you've set (e.g. "Runs weekly on Monday at 03:00
UTC."). If you need something the presets don't cover, choose **Custom
cron…** and type a cron expression directly — invalid cron strings are
rejected immediately with a clear error either way. Save, and it will show up
under **Scheduled Pipelines** on the Jobs page with its next run time, and
fire automatically from then on.

## 9. Visualize it in Superset

Open **Dashboards** (`/dashboards`) and follow the link to Superset (or go
directly to http://localhost:8088).

1. **Datasets → + Dataset** → pick the existing Trino database connection →
   schema `gold` → table `customer_revenue` → **Create Dataset and Create Chart**.
2. Chart type **Bar Chart**: X-axis `customer_id`, Metric `SUM(amount_sum)`,
   save as e.g. "Guided Project — Revenue by Customer".
3. **Dashboards → + Dashboard**, drag your new chart onto it, **Save**.

It'll now appear back in the OpenLakehouse **Dashboards** page alongside the
built-in Sales/Customer/Streaming/Data Quality dashboards.

## 10. Train and register a model with MLflow

Back in your Jupyter notebook, add a new cell (this installs the MLflow/Trino
client libraries — they aren't baked into the Jupyter image):

```python
%pip install --quiet mlflow==2.19.0 trino scikit-learn

import os
os.environ["MLFLOW_TRACKING_URI"] = "http://mlflow:5000"
os.environ["MLFLOW_S3_ENDPOINT_URL"] = "http://minio:9000"
os.environ["AWS_ACCESS_KEY_ID"] = "minioadmin"
os.environ["AWS_SECRET_ACCESS_KEY"] = "minioadmin123"

import mlflow
import trino
import pandas as pd
from sklearn.linear_model import LinearRegression

conn = trino.dbapi.connect(host="trino", port=8080, user="jupyter", catalog="iceberg", schema="gold")
cur = conn.cursor()
cur.execute("SELECT customer_id, amount_sum, order_id_count FROM gold.customer_revenue")
rows = cur.fetchall()
df = pd.DataFrame(rows, columns=[d[0] for d in cur.description])

X = df[["order_id_count"]]
y = df["amount_sum"]
model = LinearRegression().fit(X, y)

mlflow.set_experiment("guided_project_revenue")
with mlflow.start_run():
    mlflow.log_param("model_type", "LinearRegression")
    mlflow.log_metric("r2_score", model.score(X, y))
    mlflow.sklearn.log_model(model, "model", registered_model_name="guided_project_revenue_model")

print("logged run, r2 =", model.score(X, y))
```

Open **ML** (`/ml`) → **Experiments** to see the run, and **Models**
(`/models`) to see `guided_project_revenue_model` version 1 — backed by a real
MLflow registry with the artifact stored at `s3://mlflow/...` in MinIO.

## 11. Version it in Gitea

1. Open Gitea (http://localhost:3010), log in as `olh-admin` /
   `openlakehouse_dev_password`.
2. **+ → New Repository**, name it `guided-project-orders`, **Create Repository**.
3. Use the web UI's **Upload File** button to add `sample_orders.csv` and the
   compiled SQL from step 3/4 (copy it from **View Compiled SQL** into a
   `.sql` file), then commit.

   If you have `git` installed locally, you can instead clone and push directly:
   ```bash
   git clone http://olh-admin:openlakehouse_dev_password@localhost:3010/olh-admin/guided-project-orders.git
   ```

You can also link this repo to your OpenLakehouse workspace from the
**Workspace** page (`git_repo_url` field) so it shows up alongside the project.

## 12. Monitor it

Open **Monitoring** (`/monitoring`) in the app, or go straight to Grafana
(http://localhost:3300, `admin` / `openlakehouse_dev_password`) and check the
Spark and Trino dashboards — you'll see real metrics from the jobs you just ran
(Spark write from step 2, Trino CTAS queries from steps 3–4), plus backend API
request counts from every click you made along the way.

---

### What you built

```
sample_orders.csv  →  bronze.orders_raw  →  silver.orders_clean  →  gold.customer_revenue
  (Jupyter/Spark)         │                        │
                    not_null / unique         aggregate (sum, count)
                    quality checks                   │
                          │                          ├──▶ SQL analytics (Trino)
                          ▼                          ├──▶ Superset dashboard
                    Data Quality page                ├──▶ MLflow-tracked model
                          │                           └──▶ Lineage graph
                          ▼
                  Dagster-orchestrated reruns  →  versioned in Gitea  →  watched in Grafana
```

Every step above ran against a real Spark/Trino/Kafka/MLflow/Superset/Dagster/
Gitea/Grafana service on your own machine — nothing here is mocked or stubbed.
