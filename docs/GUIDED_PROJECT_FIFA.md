# Guided Project: FIFA World Cup 2026 Player Performance Analytics

A hands-on, end-to-end project you build yourself on top of OpenLakehouse,
using a real 54,600-row dataset: **1,050 matches, 48 teams, 1,248 players**
of a simulated FIFA World Cup 2026. Every step maps to something real — a
real file, a real button in the UI, a real Spark/Trino/Superset job. By the
end you'll have taken one CSV all the way through: raw data → Bronze →
**6 advanced No-Code pipelines** (filters, quality gates, aggregates,
dedup, window functions, pivots) → Silver/Gold Iceberg tables → an advanced
multi-chart Superset dashboard → lineage → orchestration → a tracked ML model.

Estimated scope: a full afternoon (more than the original orders walkthrough —
this one is intentionally "advanced").

## 0. Prerequisites

Start (or confirm) the full stack is up:

```powershell
docker compose --profile full up -d --build
docker compose ps
```

Wait until everything shows `Up`/`healthy` (`redis-exporter` showing
"unhealthy" is a known cosmetic bug in that image's own baked-in healthcheck —
ignore it, `/metrics` still serves real data).

**Access points and credentials you'll need:**

| Service | URL | Login |
|---|---|---|
| OpenLakehouse app | http://localhost | `engineer.user` / `openlakehouse` (or `admin.user` / `openlakehouse`) |
| Jupyter | http://localhost:8888/jupyter/?token=openlakehouse | token: `openlakehouse` |
| Apache Superset | http://localhost:8088 | `admin` / `openlakehouse_dev_password` |
| MLflow | http://localhost:5000 | no auth |
| Dagster | http://localhost:3001 | no auth |
| Gitea | http://localhost:3010 | `olh-admin` / `openlakehouse_dev_password` |
| Grafana | http://localhost:3300 | `admin` / `openlakehouse_dev_password` |

> Always browse the app itself via **http://localhost** (port 80, through
> Traefik) — the frontend's own dev port doesn't proxy `/api` and POSTs will
> fail with 405.

## 1. The dataset

[docs/guided_project/fifa_world_cup_2026_player_performance.csv](guided_project/fifa_world_cup_2026_player_performance.csv)
— 54,600 rows, one row per player per match (52 players × 1,050 matches: two
26-man squads per match, including unused substitutes with `minutes_played=0`).

Key columns: `player_id`, `player_name`, `team`, `position` (Goalkeeper /
Defender / Midfielder / Forward), `match_id`, `match_date`, `tournament_stage`
(Group Stage/Round of 32/Round of 16/Quarter Finals/Semi Finals/Third Place
Match/Final), `match_result` (`W`/`D`/`L`), `goals_team`/`goals_opponent`,
plus per-match performance stats: `goals`, `assists`, `shots`,
`expected_goals_xg`, `pass_accuracy`, `player_rating`, `distance_covered_km`,
etc.

> **Data quality note (important, and a good real-world lesson):** the CSV
> also has pre-computed `total_goals_tournament`/`total_assists_tournament`/
> `player_of_match_awards`/`tournament_rating` columns that look like running
> tournament totals, but they're actually random per-row noise (the same
> player's `total_goals_tournament` jumps 0→2→0→3 across matches, not
> monotonically). **Never trust a pre-aggregated column from a raw source —
> always recompute aggregates yourself from the granular facts.** That's
> exactly what the pipelines below do (`SUM(goals)` across matches), and it's
> why they don't use those four columns at all.

This file is already mounted read-only into both Jupyter
(`/opt/notebooks/guided_project/…csv`) and Spark
(`/opt/spark-data/…csv`) — no manual upload needed, unlike the original
30-row orders walkthrough (this file is 17 MB, too big to comfortably
drag-and-drop).

## 2. Load it into Bronze via Jupyter

1. Open Jupyter: http://localhost:8888/jupyter/?token=openlakehouse
2. **File → New → Notebook**, Python 3 kernel.
3. Run:

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

   Expected: `rows written: 54600`. (`catalog` is Spark's alias for the shared
   Iceberg/Polaris warehouse; Trino's alias for the same warehouse is
   `iceberg` — same tables, different per-engine names.)

4. **Verify** in the app: **Catalog** (`/catalog`) → `iceberg` → `bronze` →
   `fifa_player_matches` — 71 columns, 54,600 rows.

## 3. Explore it with SQL first

Open **SQL** (`/sql`) and run a few real exploratory queries before building
anything — this is how you'd normally scope out a new dataset:

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

## 4. Build the Bronze → Silver pipeline (quality gates + filter + derive)

Open **No-Code Builder** (`/pipelines`). Every node's config is raw JSON in
the right-hand panel, applied with **Apply** — no separate form fields.

Create a pipeline named `fifa_bronze_to_silver_appearances` with 7 nodes
chained in a straight line **A → B → C → D → E → F → G**:

| # | Kind | Type | Config JSON |
|---|---|---|---|
| A | source | `iceberg_table` | `{"schema": "bronze", "table": "fifa_player_matches"}` |
| B | quality | `not_null` | `{"columns": ["player_id", "match_id", "team", "position"]}` |
| C | quality | `unique` | `{"columns": ["player_id", "match_id"]}` |
| D | quality | `range` | `{"column": "pass_accuracy", "min": 0, "max": 1}` |
| E | transform | `filter` | `{"condition": "minutes_played > 0"}` |
| F | transform | `derived_column` | `{"name": "goal_contribution", "expression": "goals + assists"}` |
| G | destination | `iceberg_silver` | `{"table": "player_match_appearances"}` |

This demonstrates a real **quality gate**: B/C/D check the raw data before
any transformation touches it (0 violations expected, since step 3 already
confirmed the data is clean), then E drops the ~23,000 unused-substitute rows
(`minutes_played = 0`), and F adds a derived metric.

**Save → View Compiled SQL** (sanity-check it), then **Run**. Expected result:
`iceberg.silver.player_match_appearances` with **31,558 rows** (54,600 rows
minus the ones with 0 minutes played).

> **Gotcha:** destinations compile to `CREATE TABLE IF NOT EXISTS ... AS
> SELECT` — re-running a pipeline after its table already exists is a no-op.
> `DROP TABLE iceberg.silver.player_match_appearances` from the SQL page first
> if you want to rebuild it.

## 5. Build 5 advanced Silver/Bronze → Gold pipelines

Each of these is its own saved pipeline. They cover aggregate, sort, dedupe,
multi-step derived columns, **window functions**, and **pivot** — the full
range of what the compiler supports.

### 5a. `fifa_gold_top_scorers` — aggregate + sort

| # | Kind | Type | Config JSON |
|---|---|---|---|
| A | source | `iceberg_table` | `{"schema": "silver", "table": "player_match_appearances"}` |
| B | transform | `aggregate` | `{"group_by": ["player_id", "player_name", "team", "position"], "aggregations": {"goals": "sum", "assists": "sum", "shots": "sum", "minutes_played": "sum", "player_rating": "avg"}}` |
| C | transform | `sort` | `{"columns": ["goals_sum DESC"]}` |
| D | destination | `iceberg_gold` | `{"table": "top_scorers"}` |

Chain **A → B → C → D**. Aggregate output columns follow the `<col>_<func>`
convention: `goals_sum`, `assists_sum`, `shots_sum`, `minutes_played_sum`,
`player_rating_avg`. Expected: **1,248 rows** (one per player).

### 5b. `fifa_gold_team_standings` — dedup + multi-step derive + aggregate

Player rows repeat `match_result`/`goals_team`/`goals_opponent` once per
player on that team, so we must **dedupe to one row per (match, team)**
before aggregating team results.

| # | Kind | Type | Config JSON |
|---|---|---|---|
| A | source | `iceberg_table` | `{"schema": "bronze", "table": "fifa_player_matches"}` |
| B | transform | `deduplicate` | `{"columns": ["match_id", "team"]}` |
| C | transform | `derived_column` | `{"name": "is_win", "expression": "CASE WHEN match_result = 'W' THEN 1 ELSE 0 END"}` |
| D | transform | `derived_column` | `{"name": "is_draw", "expression": "CASE WHEN match_result = 'D' THEN 1 ELSE 0 END"}` |
| E | transform | `derived_column` | `{"name": "is_loss", "expression": "CASE WHEN match_result = 'L' THEN 1 ELSE 0 END"}` |
| F | transform | `aggregate` | `{"group_by": ["team"], "aggregations": {"is_win": "sum", "is_draw": "sum", "is_loss": "sum", "goals_team": "sum", "goals_opponent": "sum"}}` |
| G | destination | `iceberg_gold` | `{"table": "team_standings"}` |

Chain **A → B → C → D → E → F → G**. Expected: **48 rows** (one per team)
with columns `team`, `is_win_sum`, `is_draw_sum`, `is_loss_sum`,
`goals_team_sum`, `goals_opponent_sum`.

### 5c. `fifa_gold_position_benchmarks` — simple aggregate

| # | Kind | Type | Config JSON |
|---|---|---|---|
| A | source | `iceberg_table` | `{"schema": "silver", "table": "player_match_appearances"}` |
| B | transform | `aggregate` | `{"group_by": ["position"], "aggregations": {"player_rating": "avg", "pass_accuracy": "avg", "distance_covered_km": "avg", "goals": "sum", "assists": "sum"}}` |
| C | destination | `iceberg_gold` | `{"table": "position_benchmarks"}` |

Chain **A → B → C**. Expected: **4 rows** (Goalkeeper/Defender/Midfielder/Forward).

### 5d. `fifa_gold_top_scorer_per_team` — aggregate + window + filter

| # | Kind | Type | Config JSON |
|---|---|---|---|
| A | source | `iceberg_table` | `{"schema": "silver", "table": "player_match_appearances"}` |
| B | transform | `aggregate` | `{"group_by": ["player_id", "player_name", "team"], "aggregations": {"goals": "sum"}}` |
| C | transform | `window` | `{"name": "team_rank", "expression": "RANK() OVER (PARTITION BY team ORDER BY goals_sum DESC)"}` |
| D | transform | `filter` | `{"condition": "team_rank <= 3"}` |
| E | destination | `iceberg_gold` | `{"table": "top_scorer_per_team"}` |

Chain **A → B → C → D → E**. Expected: **173 rows** (more than 48×3=144
because `RANK()` gives tied players — e.g. several 0-goal players tied for
rank 1 on a low-scoring team — the same rank, so ties over-fill the top 3).

### 5e. `fifa_gold_goals_by_stage` — dedup + derive + pivot

| # | Kind | Type | Config JSON |
|---|---|---|---|
| A | source | `iceberg_table` | `{"schema": "bronze", "table": "fifa_player_matches"}` |
| B | transform | `deduplicate` | `{"columns": ["match_id", "team"]}` |
| C | transform | `derived_column` | `{"name": "stage_clean", "expression": "replace(tournament_stage, ' ', '_')"}` |
| D | transform | `pivot` | `{"group_by": ["team"], "pivot_column": "stage_clean", "value_column": "goals_team", "values": ["'Group_Stage'", "'Round_of_32'", "'Round_of_16'", "'Quarter_Finals'", "'Semi_Finals'", "'Final'", "'Third_Place_Match'"], "agg": "sum"}` |
| E | destination | `iceberg_gold` | `{"table": "goals_by_stage"}` |

Chain **A → B → C → D → E**. Expected: **48 rows**, one per team, with a
column per tournament stage holding that team's total goals scored in it.

> **Gotcha:** the pivot node turns each `values` entry into a column name via
> `CASE WHEN pivot_column = value THEN ...`, and the generated alias must be a
> valid SQL identifier — `tournament_stage`'s raw values ("Group Stage") have
> spaces and would fail. Step C first replaces spaces with underscores so the
> pivoted column names (`Group_Stage`, `Round_of_32`, …) are valid.

**Verify all 6 tables** on the **Catalog** page (`/catalog` → `iceberg` →
`silver`/`gold`), or from SQL:

```sql
SELECT * FROM iceberg.gold.top_scorers ORDER BY goals_sum DESC LIMIT 10;
SELECT * FROM iceberg.gold.team_standings ORDER BY is_win_sum DESC;
SELECT * FROM iceberg.gold.position_benchmarks;
SELECT * FROM iceberg.gold.top_scorer_per_team WHERE team = 'Spain';
SELECT * FROM iceberg.gold.goals_by_stage;
```

## 6. Check the data quality gate

Open **Data Quality** (`/quality`) — you'll see the `not_null`, `unique`, and
`range` checks from `fifa_bronze_to_silver_appearances` scored as passing (0
violations each).

*Optional — see a real failure:* in Jupyter, append a duplicate `(player_id,
match_id)` row (`df.limit(1).writeTo("catalog.bronze.fifa_player_matches").append()`),
re-run the pipeline. The `unique` node now reports a violation, the run
status flips to `FAILED`, and the silver destination node is **skipped**
(quality gates really block downstream writes) — remember to `DROP TABLE` and
re-ingest a clean copy afterwards if you do this.

## 7. Check lineage

Open **Lineage** (`/lineage`). You should see all 6 pipelines' edges:
`bronze.fifa_player_matches → silver.player_match_appearances → gold.top_scorers`,
`→ gold.position_benchmarks`, `→ gold.top_scorer_per_team`, and
`bronze.fifa_player_matches → gold.team_standings` /
`→ gold.goals_by_stage` (these two read bronze directly).

## 8. Orchestrate with Dagster

Get each pipeline's UUID:

```powershell
$token = (Invoke-RestMethod -Method Post -Uri "http://localhost:8081/realms/openlakehouse/protocol/openid-connect/token" `
  -Body @{grant_type="password"; client_id="openlakehouse-web"; username="engineer.user"; password="openlakehouse"} `
  -ContentType "application/x-www-form-urlencoded").access_token

Invoke-RestMethod -Uri "http://localhost/api/v1/pipelines" -Headers @{Authorization="Bearer $token"} |
  Select-Object id, name
```

In Dagster (http://localhost:3001): **Jobs → run_pipeline_job → Launchpad**:

```yaml
ops:
  run_pipeline_op:
    config:
      pipeline_id: "<paste-the-uuid-here>"
```

**Launch Run** for each of the 6 pipelines in dependency order (silver one
first, then the 5 gold ones) to rebuild the whole thing unattended.

## 9. Build the advanced Superset dashboard

Open Superset (http://localhost:8088, `admin`/`openlakehouse_dev_password`).
The Trino connection (`trino://dbt@trino:8080/iceberg`) already exists from
platform setup — reuse it for every dataset below.

**Create 5 datasets** (**Datasets → + Dataset** → existing Trino DB → pick
schema/table → **Create Dataset and Create Chart** each time):

| Dataset | Schema.Table |
|---|---|
| Top Scorers | `gold.top_scorers` |
| Team Standings | `gold.team_standings` |
| Position Benchmarks | `gold.position_benchmarks` |
| Top Scorer per Team | `gold.top_scorer_per_team` |
| Goals by Stage | `gold.goals_by_stage` |

**Build 6 charts:**

1. **Top 15 Goal Scorers** — Bar Chart on `Top Scorers`: X-axis `player_name`,
   Metric `SUM(goals_sum)`, Sort Descending, Row Limit 15.
2. **Team Wins/Draws/Losses** — Bar Chart (stacked) on `Team Standings`:
   X-axis `team`, Metrics `SUM(is_win_sum)`, `SUM(is_draw_sum)`,
   `SUM(is_loss_sum)`.
3. **Goal Difference Leaderboard** — Table on `Team Standings` with a custom
   SQL metric `SUM(goals_team_sum) - SUM(goals_opponent_sum)` labeled
   `goal_difference`, sorted descending.
4. **Avg Rating by Position** — Bar Chart on `Position Benchmarks`: X-axis
   `position`, Metric `AVG(player_rating_avg)`.
5. **Top 3 Scorers per Team** — Table on `Top Scorer per Team`: columns
   `team`, `player_name`, `goals_sum`, `team_rank`, sorted by `team`,
   `team_rank`.
6. **Goals by Tournament Stage (Heatmap)** — pick the Heatmap chart type on
   `Goals by Stage` (or a Table if Heatmap needs a melted/long-format source —
   the Table works directly on the wide pivot columns).

**Assemble the dashboard:** **Dashboards → + Dashboard**, name it "FIFA World
Cup 2026 Performance Analytics", drag all 6 charts onto the canvas, arrange
into a grid, **Save**. It'll also show up on the OpenLakehouse app's
**Dashboards** page (`/dashboards`).

## 10. Train a model with MLflow (optional, level up)

Predict `player_rating` from match stats, in a new Jupyter cell:

```python
%pip install --quiet mlflow==2.19.0 trino scikit-learn

import os
os.environ["MLFLOW_TRACKING_URI"] = "http://mlflow:5000"
os.environ["MLFLOW_S3_ENDPOINT_URL"] = "http://minio:9000"
os.environ["AWS_ACCESS_KEY_ID"] = "minioadmin"
os.environ["AWS_SECRET_ACCESS_KEY"] = "minioadmin123"

import mlflow, trino, pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split

conn = trino.dbapi.connect(host="trino", port=8080, user="jupyter", catalog="iceberg", schema="silver")
cur = conn.cursor()
cur.execute("""
    SELECT goals, assists, shots, pass_accuracy, distance_covered_km,
           tackles, interceptions, player_rating
    FROM silver.player_match_appearances
""")
df = pd.DataFrame(cur.fetchall(), columns=[d[0] for d in cur.description])

X = df.drop(columns=["player_rating"])
y = df["player_rating"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = LinearRegression().fit(X_train, y_train)
r2 = model.score(X_test, y_test)

mlflow.set_experiment("fifa_player_rating")
with mlflow.start_run():
    mlflow.log_param("model_type", "LinearRegression")
    mlflow.log_metric("r2_score", r2)
    mlflow.sklearn.log_model(model, "model", registered_model_name="fifa_player_rating_model")

print("r2 on held-out matches:", r2)
```

Open **ML** (`/ml`) → **Experiments**/**Models** to see the real tracked run
and registered model version.

## 11. Version it in Gitea (optional)

Open Gitea (http://localhost:3010), **+ → New Repository** →
`fifa-guided-project`, then upload the 6 pipelines' compiled SQL (copy each
from **View Compiled SQL**) plus the ingestion notebook.

## 12. Monitor it

Open **Monitoring** (`/monitoring`) or Grafana directly (http://localhost:3300)
— the Spark write from step 2 and the 6 Trino CTAS queries from steps 4–5 all
show up as real metrics, alongside backend API request counts from every
click along the way.

---

### What you built

```
fifa_world_cup_2026_player_performance.csv (54,600 rows)
              │  (Jupyter/Spark)
              ▼
    bronze.fifa_player_matches ──────────────────────────┐
              │  not_null/unique/range gate               │
              │  + filter(minutes_played>0) + derive       │  dedup + derive + aggregate
              ▼                                            ▼
    silver.player_match_appearances (31,558)      gold.team_standings (48)
        │        │         │                      gold.goals_by_stage (48)
        │        │         └─ aggregate ──────▶ gold.position_benchmarks (4)
        │        └─ aggregate + sort ─────────▶ gold.top_scorers (1,248)
        └─ aggregate + window + filter ───────▶ gold.top_scorer_per_team (173)
                                                        │
                                    ├──▶ 6-chart Superset dashboard
                                    ├──▶ MLflow-tracked rating model
                                    ├──▶ Lineage graph
                                    └──▶ Dagster-orchestrated reruns
```

Every step ran (or will run, when you follow it) against a real
Spark/Trino/Superset/MLflow/Dagster service — the row counts and generated
SQL above were verified end-to-end while writing this guide, nothing here is
aspirational.
