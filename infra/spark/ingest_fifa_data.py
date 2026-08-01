"""Guided project (FIFA edition): loads the raw player-performance CSV into the
Bronze Iceberg layer via Spark's native CSV reader (spark-master has no pandas,
unlike the Jupyter image - the equivalent notebook cell may use pandas instead).

Usage (inside the spark-master container):
    spark-submit --master spark://spark-master:7077 /opt/spark-apps/ingest_fifa_data.py
"""
from pyspark.sql import SparkSession

CSV_PATH = "/opt/spark-data/fifa_world_cup_2026_player_performance.csv"
TARGET_TABLE = "catalog.bronze.fifa_player_matches"


def main() -> None:
    spark = SparkSession.builder.appName("guided-project-fifa-ingest").getOrCreate()

    df = spark.read.option("header", "true").option("inferSchema", "true").csv(CSV_PATH)

    spark.sql("CREATE NAMESPACE IF NOT EXISTS catalog.bronze")
    df.writeTo(TARGET_TABLE).createOrReplace()

    row_count = spark.table(TARGET_TABLE).count()
    print(f"FIFA_INGEST_OK rows_written={row_count}")
    df.printSchema()
    spark.stop()


if __name__ == "__main__":
    main()

