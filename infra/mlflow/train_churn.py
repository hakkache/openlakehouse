"""Phase 15 — real Customer Churn Prediction training pipeline.

Iceberg (dbt_marts.mart_customer_churn_features, built in Phase 13/15 from the
Phase 11 Kafka streaming demo orders) -> feature engineering -> scikit-learn
training -> MLflow tracking (params/metrics/artifacts) -> MLflow Model Registry.
"""
import os

import mlflow
import mlflow.sklearn
import pandas as pd
import trino
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

TRINO_HOST = os.environ.get("TRINO_HOST", "trino")
TRINO_PORT = int(os.environ.get("TRINO_PORT", "8080"))
TRINO_CATALOG = os.environ.get("TRINO_CATALOG", "iceberg")

MLFLOW_TRACKING_URI = os.environ.get("MLFLOW_TRACKING_URI", "http://mlflow:5000")
EXPERIMENT_NAME = "customer_churn_prediction"
MODEL_NAME = "customer_churn_model"

FEATURE_COLUMNS = ["order_count", "total_amount", "avg_order_amount"]
LABEL_COLUMN = "churned"


def load_features() -> pd.DataFrame:
    conn = trino.dbapi.connect(
        host=TRINO_HOST,
        port=TRINO_PORT,
        user="mlflow",
        catalog=TRINO_CATALOG,
        schema="dbt_marts",
    )
    cur = conn.cursor()
    cur.execute(
        "SELECT customer_id, order_count, total_amount, avg_order_amount, churned "
        "FROM dbt_marts.mart_customer_churn_features"
    )
    rows = cur.fetchall()
    columns = [d[0] for d in cur.description]
    return pd.DataFrame(rows, columns=columns)


def main() -> None:
    df = load_features()
    print(f"Loaded {len(df)} customer rows from iceberg.dbt_marts.mart_customer_churn_features")
    print(df)

    x = df[FEATURE_COLUMNS]
    y = df[LABEL_COLUMN]

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.25, random_state=42, stratify=y if y.nunique() > 1 else None
    )

    scaler = StandardScaler()
    x_train_scaled = scaler.fit_transform(x_train)
    x_test_scaled = scaler.transform(x_test)

    params = {"C": 1.0, "max_iter": 200, "random_state": 42}
    model = LogisticRegression(**params)
    model.fit(x_train_scaled, y_train)

    y_pred = model.predict(x_test_scaled)
    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision": precision_score(y_test, y_pred, zero_division=0),
        "recall": recall_score(y_test, y_pred, zero_division=0),
        "f1_score": f1_score(y_test, y_pred, zero_division=0),
    }
    print("Test metrics:", metrics)

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(EXPERIMENT_NAME)

    with mlflow.start_run(run_name="logistic_regression_churn") as run:
        mlflow.log_param("feature_columns", ",".join(FEATURE_COLUMNS))
        mlflow.log_param("train_rows", len(x_train))
        mlflow.log_param("test_rows", len(x_test))
        for k, v in params.items():
            mlflow.log_param(k, v)
        for k, v in metrics.items():
            mlflow.log_metric(k, v)

        df.to_csv("/tmp/training_data_snapshot.csv", index=False)
        mlflow.log_artifact("/tmp/training_data_snapshot.csv")

        mlflow.sklearn.log_model(
            sk_model=model,
            artifact_path="model",
            registered_model_name=MODEL_NAME,
        )

        print(f"MLflow run_id={run.info.run_id}, experiment_id={run.info.experiment_id}")

    print("Training complete. Model registered as:", MODEL_NAME)


if __name__ == "__main__":
    main()
