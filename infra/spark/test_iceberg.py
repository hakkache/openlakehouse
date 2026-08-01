"""Phase 3 acceptance test: proves Spark can talk to the real Polaris Iceberg
REST catalog backed by real MinIO storage. Not a mock: this runs against the
live spark-master/polaris/minio containers via spark-submit.

Usage (inside the spark-master container):
    spark-submit --master spark://spark-master:7077 /opt/spark-apps/test_iceberg.py
"""
from pyspark.sql import SparkSession


def main() -> None:
    spark = SparkSession.builder.appName("openlakehouse-phase3-test").getOrCreate()

    # 1. Prove the cluster executes distributed work.
    count = spark.range(100).count()
    assert count == 100, f"expected 100, got {count}"

    # 2. Prove the Iceberg REST catalog (Polaris) + MinIO storage work.
    spark.sql("CREATE NAMESPACE IF NOT EXISTS catalog.bronze")

    df = spark.range(10).withColumnRenamed("id", "id")
    df.writeTo("catalog.bronze.test").createOrReplace()

    read_back = spark.table("catalog.bronze.test")
    read_count = read_back.count()
    assert read_count == 10, f"expected 10, got {read_count}"

    # 3. Prove basic DML + schema evolution + snapshots work.
    spark.sql("INSERT INTO catalog.bronze.test VALUES (100)")
    after_insert = spark.table("catalog.bronze.test").count()
    assert after_insert == 11, f"expected 11, got {after_insert}"

    spark.sql("ALTER TABLE catalog.bronze.test ADD COLUMN label STRING")
    spark.sql("UPDATE catalog.bronze.test SET label = 'x' WHERE id = 100")

    snapshots = spark.sql("SELECT count(*) as c FROM catalog.bronze.test.snapshots").collect()[0]["c"]
    assert snapshots >= 2, f"expected at least 2 snapshots, got {snapshots}"

    print(f"PHASE3_TEST_OK range_count={count} table_count_after_writes={after_insert} snapshots={snapshots}")
    spark.stop()


if __name__ == "__main__":
    main()
