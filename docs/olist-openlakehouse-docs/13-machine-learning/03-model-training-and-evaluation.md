# 03 — Model Training and Evaluation

**Content type: PROJECT IMPLEMENTATION**, following the exact real
pattern already proven in `infra/mlflow/train_churn.py`.

## Hands-On Walkthrough — a real training script for this use case

1. Create `infra/mlflow/train_late_delivery.py`, modeled directly on the
   real `train_churn.py` (same Trino connection pattern, same MLflow
   tracking calls), but reading the new feature mart and one-hot-encoding
   the categorical columns:
   ```python
   import mlflow, mlflow.sklearn, pandas as pd, trino, os
   from sklearn.linear_model import LogisticRegression
   from sklearn.model_selection import train_test_split
   from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
   from sklearn.preprocessing import StandardScaler, OneHotEncoder
   from sklearn.compose import ColumnTransformer
   from sklearn.pipeline import Pipeline

   TRINO_HOST = os.environ.get("TRINO_HOST", "trino")
   MLFLOW_TRACKING_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://mlflow:5000")

   conn = trino.dbapi.connect(host=TRINO_HOST, port=8080, user="mlflow",
                               catalog="iceberg", schema="dbt_marts")
   cur = conn.cursor()
   cur.execute("SELECT * FROM dbt_marts.mart_late_delivery_features")
   df = pd.DataFrame(cur.fetchall(), columns=[d[0] for d in cur.description])

   cat_cols = ["customer_state", "seller_state", "product_category_name_english"]
   num_cols = ["price", "freight_value", "purchase_day_of_week"]
   x = df[cat_cols + num_cols]
   y = df["is_late"].astype(int)

   x_train, x_test, y_train, y_test = train_test_split(
       x, y, test_size=0.25, random_state=42, stratify=y)

   pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), cat_cols),
                            ("num", StandardScaler(), num_cols)])
   pipe = Pipeline([("pre", pre), ("clf", LogisticRegression(max_iter=200, class_weight="balanced"))])
   pipe.fit(x_train, y_train)
   y_pred = pipe.predict(x_test)

   mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
   mlflow.set_experiment("late_delivery_prediction")
   with mlflow.start_run(run_name="logistic_regression_late_delivery") as run:
       mlflow.log_param("class_weight", "balanced")
       for name, fn in [("accuracy", accuracy_score), ("precision", precision_score),
                        ("recall", recall_score), ("f1_score", f1_score)]:
           mlflow.log_metric(name, fn(y_test, y_pred))
       mlflow.sklearn.log_model(pipe, "model", registered_model_name="late_delivery_model")
       print("run_id:", run.info.run_id)
   ```
   Note `class_weight="balanced"` — a direct, necessary response to
   doc 01's confirmed class imbalance.
2. Run it the same way `train_churn.py` is run (per
   `infra/mlflow/Dockerfile.train`):
   ```powershell
   docker compose run --rm mlflow-train python train_late_delivery.py
   ```
   (adjust the service/script name to match your actual
   `docker-compose.yml` entry for the training container).
3. **Expected result**: real printed metrics — note your actual
   precision/recall/F1 (don't expect high numbers; late-delivery
   prediction from purchase-time features alone is a genuinely hard
   problem — an honest result, not a inflated demo number).

> 🧪 **Checkpoint**: you trained a real logistic regression on your own
> leakage-free feature mart and have genuine, non-fabricated metric
> values from the actual holdout set.

## Next document

[`04-mlflow-tracking-and-registry.md`](04-mlflow-tracking-and-registry.md).
