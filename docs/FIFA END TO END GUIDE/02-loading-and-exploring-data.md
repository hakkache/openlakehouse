# Part 2 — Loading & Exploring Data

**[← Guide index](00-README.md)** · Part 2 of 14 · Previous: [Part 1 — Orientation, Setup & the Dataset](01-orientation-setup-and-dataset.md) · Next: [Part 3 — No-Code Pipeline Builder Fundamentals →](03-pipeline-builder-fundamentals.md)

---

## Chapter 3 — Loading data: Jupyter + PySpark

**Depends on:** Part 1 (stack running, dataset location).

### 3.1 What Jupyter is for in this platform

Jupyter is the **on-ramp for any new raw data** — anything not already an
Iceberg table has to land as one via a real Spark write, and Jupyter is
where you write that one-time (or scheduled) ingestion code by hand. It is
*not* meant for routine transformation work — that's the No-Code Builder's
job (Part 3–4).

### 3.2 Step-by-step: load the CSV

1. Open Jupyter: http://localhost:8888/jupyter/?token=openlakehouse
2. **File → New → Notebook**, choose the **Python 3** kernel.
3. Run this cell:

   ```python
   import pandas as pd
   from pyspark.sql import SparkSession

   spark = SparkSession.builder.appName("fifa-guided-project-ingest").getOrCreate()

   pdf = pd.read_csv("/opt/notebooks/guided_project/fifa_world_cup_2026_player_performance.csv")
   df = spark.createDataFrame(pdf)

   spark.sql("CREATE NAMESPACE IF NOT EXISTS catalog.bronze")
   df.writeTo("catalog.bronze.fifa_player_matches").createOrReplace()

   print("rows written:", spark.table("catalog.bronze.fifa_player_matches").count())
   df.printSchema()
   ```

4. Expected output: `rows written: 54600`, followed by a 71-line schema
   printout (Spark's inferred types — mostly `long`/`double`/`string`).

**What just happened, internally:** `SparkSession.builder...getOrCreate()`
connects to the shared Spark cluster (Master + Worker containers) using the
`catalog` Iceberg REST catalog alias configured in
`infra/spark/spark-defaults.conf`. `writeTo(...).createOrReplace()` asks
Polaris to register a brand-new Iceberg table, then writes real Parquet data
files into MinIO under the `lakehouse` warehouse path. From this point on,
the table is queryable by **both** Spark (as `catalog.bronze.fifa_player_matches`)
**and** Trino (as `iceberg.bronze.fifa_player_matches`) — same physical
files, different per-engine alias.

### 3.3 Verify the load two ways

**A. In the app's Catalog page** (`/catalog`): expand `iceberg` → `bronze` →
`fifa_player_matches` — you should see all 71 columns and a row count of
54,600.

**B. In Data Explorer** (`/explorer`, covered fully in Chapter 4): same
catalog tree, but with a one-click preview.

> 🧪 **Test it:** open the **Spark Master UI** (http://localhost:8090) →
> "Completed Applications" — you'll see the real `fifa-guided-project-ingest`
> application you just ran, with its actual duration and executor count.
> This is the pattern you'll reuse to sanity-check *every* later Spark job
> in this guide (pipeline runs, streaming, PySpark Code cells) — if a job
> doesn't show up here, it didn't really run.

---

## Chapter 4 — Catalog and Data Explorer

**Depends on:** Chapter 3 (a table must exist to browse).

### 4.1 What these pages are for

Both pages browse the **same underlying catalog metadata** (queried live
from Trino's `information_schema`/`SHOW` commands — not a cached snapshot),
but serve different purposes:

- **Catalog** (`/catalog`) — a pure browse/reference view: catalog → schema
  → table → columns, with row counts. Good for a quick "what tables exist"
  glance.
- **Data Explorer** (`/explorer`) — the same tree **plus** an integrated
  query runner (SQL and PySpark Code modes) and a right-click context menu —
  the page you'll actually work from day to day.

### 4.2 Step-by-step: browse and preview

1. Open **Data Explorer** (`/explorer`).
2. In the left tree, expand `iceberg` (catalog) → `bronze` (schema) →
   `fifa_player_matches` (table) → see all 71 columns listed with their
   Trino types.
3. Click the table name — this switches the right pane to **SQL mode** and
   runs `SELECT * FROM iceberg.bronze.fifa_player_matches LIMIT 100`,
   showing a real 100-row preview grid.

### 4.3 Right-click context menu — every action explained

Right-click the **table** node for:

| Action | What it does |
|---|---|
| Preview first 100 rows | Runs `SELECT * FROM <table> LIMIT 100`, same as clicking the table |
| Copy table name | Copies `fifa_player_matches` to clipboard, with a toast confirmation |
| Copy fully qualified name | Copies `iceberg.bronze.fifa_player_matches` |
| Copy SELECT statement | Copies `SELECT * FROM iceberg.bronze.fifa_player_matches LIMIT 100` — paste straight into SQL Lab or a pipeline's raw JSON |
| Row count | Runs `SELECT COUNT(*) AS row_count FROM <table>` immediately, real result shown in the grid |

Right-click a **schema** node (e.g. `bronze`) for copy-name /
copy-fully-qualified-name. Right-click a **column** node (expand the table
first) for copy-name / copy-qualified-name. These are the fastest way to
grab exact identifiers while building pipelines (Part 3–4) or writing
Superset chart SQL (Part 9's §14.6).

> 🧪 **Test it:** right-click `fifa_player_matches` → **Row count** — the
> results grid should show exactly `54600`, matching Chapter 3's printed
> count from Spark. Two independent engines (Trino here, Spark in Jupyter)
> agreeing on the exact same number is proof they're reading the same
> physical Iceberg table, not two different copies.

---

## Chapter 5 — SQL Editor (Trino) and ad-hoc PySpark Code

**Depends on:** Chapter 3.

### 5.1 SQL mode — exploratory queries

Open **SQL** (`/sql`) (or Data Explorer's SQL mode). Run these before
building anything — this is how you'd normally scope out any new dataset:

```sql
-- shape of the dataset
SELECT count(*) AS rows, count(DISTINCT match_id) AS matches,
       count(DISTINCT team) AS teams, count(DISTINCT player_id) AS players
FROM iceberg.bronze.fifa_player_matches;
-- 54600, 1050, 48, 1248

-- matches per tournament stage
SELECT tournament_stage, count(DISTINCT match_id) AS matches
FROM iceberg.bronze.fifa_player_matches GROUP BY tournament_stage;
-- Group Stage 578, Round of 32 178, Round of 16 126, Quarter Finals 84,
-- Semi Finals 42, Third Place Match 21, Final 21

-- confirm no duplicate (player, match) rows and no nulls in key columns
SELECT count(*) FROM (
  SELECT player_id, match_id, count(*) c FROM iceberg.bronze.fifa_player_matches
  GROUP BY player_id, match_id HAVING count(*) > 1
);
-- 0 — the dataset is already clean at the grain we need
```

Internally, every query here goes through the backend's SQL API
(`POST /api/v1/sql/query` → poll `/api/v1/sql/query/{id}`), which submits to
Trino's real query engine and polls until `FINISHED`/`FAILED` — the same
submit-and-poll pattern Trino's own CLI uses.

### 5.2 PySpark Code mode — real ad-hoc code execution

Switch the mode toggle from **SQL** to **PySpark Code** (in Data Explorer).
This runs **real, hand-written PySpark** against a shared backend-managed
`SparkSession` — not a sandboxed mock — with console-style stdout/stderr
streamed back as it executes. Try:

```python
df = spark.table("catalog.bronze.fifa_player_matches")
print("rows:", df.count())

from pyspark.sql import functions as F
(df.groupBy("team")
   .agg(F.sum("goals").alias("total_goals"))
   .orderBy(F.desc("total_goals"))
   .show(10))
```

Expected: `rows: 54600` printed, then a real top-10 teams-by-goals table
computed by Spark, not the SQL engine.

**RBAC note:** this mode requires `ADMIN` or `DATA_ENGINEER` (same trust
level as Jupyter, since it executes arbitrary code server-side) — a
`VIEWER`/`ANALYST` account won't see it enabled.

**Session lifecycle**: below the editor, a status indicator shows whether
the shared Spark session is live or idle. It auto-stops after 15 minutes of
inactivity to free cluster resources. You also get explicit manual control:

- `GET /api/v1/spark-code/session/status` — check if it's alive right now
- `POST /api/v1/spark-code/session/stop` — force-stop it immediately

Both calls are audit-logged. Use **Stop session** whenever you want a
guaranteed-fresh session on your next run, or you accidentally started a
long-running cell and want to reclaim the executor without waiting out the
idle timeout.

> 🧪 **Test it:** run the cell above, then immediately open the **Spark
> Master UI** (http://localhost:8090) — you'll see a live/completed
> application corresponding to this exact PySpark session, proving it's a
> real cluster job, not an in-process fake.

---

**[← Guide index](00-README.md)** · Part 2 of 14 · Previous: [Part 1 — Orientation, Setup & the Dataset](01-orientation-setup-and-dataset.md) · Next: [Part 3 — No-Code Pipeline Builder Fundamentals →](03-pipeline-builder-fundamentals.md)
