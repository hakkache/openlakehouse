# Part 10 — Machine Learning (MLflow) & Version Control (Gitea)

**[← Guide index](00-README.md)** · Part 10 of 14 · Previous: [Part 9 — Orchestration (Dagster) & BI Dashboards (Superset)](09-orchestration-and-bi-dashboards.md) · Next: [Part 11 — Observability & Streaming/CDC →](11-observability-and-streaming.md)

---

## Chapter 15 — Machine learning with MLflow

**Depends on:** [Part 3](03-pipeline-builder-fundamentals.md) Chapter 7 (silver table).

### 15.1 Model 1 — regression, baseline features

In a new Jupyter cell:

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
with mlflow.start_run(run_name="linear_regression_baseline"):
    mlflow.log_param("model_type", "LinearRegression")
    mlflow.log_param("features", list(X.columns))
    mlflow.log_metric("r2_score", r2)
    mlflow.sklearn.log_model(model, "model", registered_model_name="fifa_player_rating_model")

print("r2 on held-out matches:", r2)
```

### 15.2 Model 2 — richer feature set, model comparison

The bronze table has several pre-computed composite scores
(`offensive_contribution`, `defensive_contribution`, `possession_impact`,
`pressure_resistance`, `creativity_score`, `consistency_score`) not used
above. Pull those in, and compare a `RandomForestRegressor` against the
same baseline `LinearRegression`, logged as two runs in the same
experiment:

```python
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

cur.execute("""
    SELECT goals, assists, shots, pass_accuracy, distance_covered_km,
           tackles, interceptions, offensive_contribution,
           defensive_contribution, possession_impact, pressure_resistance,
           creativity_score, consistency_score, player_rating
    FROM iceberg.bronze.fifa_player_matches
    WHERE minutes_played > 0
""")
df2 = pd.DataFrame(cur.fetchall(), columns=[d[0] for d in cur.description])
X2 = df2.drop(columns=["player_rating"])
y2 = df2["player_rating"]
X2_train, X2_test, y2_train, y2_test = train_test_split(X2, y2, test_size=0.2, random_state=42)

mlflow.set_experiment("fifa_player_rating")

for name, est in [
    ("linear_regression_rich_features", LinearRegression()),
    ("random_forest_rich_features", RandomForestRegressor(n_estimators=200, max_depth=8, random_state=42)),
]:
    est.fit(X2_train, y2_train)
    preds = est.predict(X2_test)
    with mlflow.start_run(run_name=name):
        mlflow.log_param("model_type", type(est).__name__)
        mlflow.log_param("features", list(X2.columns))
        mlflow.log_metric("r2_score", est.score(X2_test, y2_test))
        mlflow.log_metric("mae", mean_absolute_error(y2_test, preds))
        mlflow.sklearn.log_model(est, "model", registered_model_name="fifa_player_rating_model_v2")
    print(name, "r2:", est.score(X2_test, y2_test))
```

Open **ML** (`/ml`) → **Experiments** → `fifa_player_rating` to see all 3
runs side by side with their `r2_score`/`mae` metrics, and **Models** to
see both registered model names with version history.

> 🧪 **Test it:** open MLflow directly (http://localhost:5000) and find the
> same experiment/runs — proof the app's **ML** page is a thin UI over a
> real MLflow tracking server, not a separate copy of the data.

---

## Chapter 16 — Version control with Gitea

**Depends on:** nothing (works with any content you've produced).

Open Gitea (http://localhost:3010), **+ → New Repository** →
`fifa-guided-project`, then upload all 11 pipelines' compiled SQL (copy each
from **View Compiled SQL**, [Part 3](03-pipeline-builder-fundamentals.md) Chapter 7) plus the ingestion notebook from
[Part 2](02-loading-and-exploring-data.md) Chapter 3.

> 🧪 **Test it:** clone the repo back down (`git clone
> http://olh-admin:openlakehouse_dev_password@localhost:3010/olh-admin/fifa-guided-project.git`)
> and confirm the files round-trip correctly — a real Git server, not a
> file-upload widget with no underlying version control.

---

**[← Guide index](00-README.md)** · Part 10 of 14 · Previous: [Part 9 — Orchestration (Dagster) & BI Dashboards (Superset)](09-orchestration-and-bi-dashboards.md) · Next: [Part 11 — Observability & Streaming/CDC →](11-observability-and-streaming.md)
