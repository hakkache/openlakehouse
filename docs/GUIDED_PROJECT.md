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
   `bronze` → `orders_raw`, and confirm the 5 columns are there.

## 3. Build the Bronze → Silver pipeline (No-Code Builder)

Open **No-Code Builder** (`/pipelines`). The builder has a node palette on the
left (grouped by kind — source/transform/quality/destination), a canvas in the
middle, and a config panel on the right that opens when you click a node. Every
node's configuration is entered as **raw JSON** in that panel's textarea, then
applied with the **Apply** button — there are no separate labeled form fields.

1. Name the pipeline: type `bronze_to_silver_orders` in the name box at the top.
2. Add these 6 nodes (click the matching button under each kind heading), then
   click each node and paste its config into the JSON textarea, click **Apply**:

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

## 7. Check lineage

Open **Lineage** (`/lineage`). Lineage is derived automatically from every saved
pipeline's source/destination nodes, so you should see:
`bronze.orders_raw → silver.orders_clean → gold.customer_revenue`, matching the
two pipelines you just built.

## 8. Orchestrate it with Dagster

Every pipeline you save is runnable from Dagster too — it calls the exact same
execution function the API uses, just out-of-process. You need each pipeline's
UUID first:

```powershell
$token = (Invoke-RestMethod -Method Post -Uri "http://localhost:8081/realms/openlakehouse/protocol/openid-connect/token" `
  -Body @{grant_type="password"; client_id="openlakehouse-web"; username="engineer.user"; password="openlakehouse"} `
  -ContentType "application/x-www-form-urlencoded").access_token

Invoke-RestMethod -Uri "http://localhost/api/v1/pipelines" -Headers @{Authorization="Bearer $token"} |
  Select-Object id, name
```

Copy the `id` for `bronze_to_silver_orders`. Then in Dagster
(http://localhost:3001): **Jobs → run_pipeline_job → Launchpad**, paste:

```yaml
ops:
  run_pipeline_op:
    config:
      pipeline_id: "<paste-the-uuid-here>"
```

Click **Launch Run** and watch it execute for real (same Trino/Iceberg write as
clicking Run in the UI). There's also a pre-built `all_pipelines_schedule` that
re-runs whichever pipeline was most recently saved every 15 minutes — turn it on
from the Dagster **Schedules** tab if you want it running unattended.

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
