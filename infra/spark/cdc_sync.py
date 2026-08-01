"""Phase 12 acceptance job: PostgreSQL -> Debezium -> Kafka -> Spark -> Iceberg CDC.

Consumes the real Debezium Postgres connector's change-event topics
(`openlakehouse.cdc.customers`, `openlakehouse.cdc.orders`) and applies each
event as a real Iceberg `MERGE INTO` against `catalog.bronze.customers_cdc` /
`catalog.bronze.orders_cdc`, correctly handling INSERT ('c'), UPDATE ('u'),
DELETE ('d'), and initial-snapshot READ ('r') events.

Uses `Trigger.availableNow()` per table (process everything currently queued,
then stop) - same bounded micro-batch pattern as the Phase 11 streaming job,
for cheap/repeatable one-off `spark-submit` verification.

Usage (inside the spark-master container):
    spark-submit --master spark://spark-master:7077 \
        --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.9,org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:1.6.1,org.apache.iceberg:iceberg-aws-bundle:1.6.1 \
        /opt/spark-apps/cdc_sync.py
"""
from pyspark.sql import SparkSession
from pyspark.sql.functions import coalesce, col, from_json, row_number
from pyspark.sql.types import DoubleType, IntegerType, StringType, StructField, StructType
from pyspark.sql.window import Window

KAFKA_BOOTSTRAP_SERVERS = "kafka:9092"

CUSTOMERS_ROW = StructType(
    [
        StructField("id", IntegerType()),
        StructField("name", StringType()),
        StructField("email", StringType()),
        StructField("created_at", StringType()),
    ]
)
ORDERS_ROW = StructType(
    [
        StructField("id", IntegerType()),
        StructField("customer_id", IntegerType()),
        StructField("amount", DoubleType()),
        StructField("status", StringType()),
        StructField("updated_at", StringType()),
    ]
)


def _envelope_schema(row_schema: StructType) -> StructType:
    return StructType(
        [
            StructField("before", row_schema),
            StructField("after", row_schema),
            StructField("op", StringType()),
        ]
    )


def _sync_table(spark: SparkSession, *, topic: str, row_schema: StructType, target: str, key: str, columns: list[str]) -> int:
    raw = (
        spark.read.format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS)
        .option("subscribe", topic)
        .option("startingOffsets", "earliest")
        .load()
    )
    if raw.rdd.isEmpty():
        return 0

    events = raw.select(
        col("offset"),
        from_json(col("value").cast("string"), _envelope_schema(row_schema)).alias("e"),
    ).select(
        col("offset"),
        col("e.op").alias("op"),
        coalesce(col("e.after"), col("e.before")).alias("row"),
    )
    flat = events.select("offset", "op", *[col(f"row.{c}").alias(c) for c in columns])

    # A single batch (full-topic re-read) may contain multiple events for the
    # same key (e.g. insert then update, or insert then delete). MERGE INTO
    # evaluates every source row against the target's pre-batch snapshot, so
    # without deduping, an update/delete for a brand-new key would incorrectly
    # be treated as NOT MATCHED alongside its own insert. Collapse to just the
    # latest event per key (by Kafka's own monotonic offset) before merging.
    latest = Window.partitionBy(key).orderBy(col("offset").desc())
    dedup = (
        flat.withColumn("_rn", row_number().over(latest))
        .filter(col("_rn") == 1)
        .drop("_rn", "offset")
    )
    dedup.createOrReplaceTempView("cdc_updates")

    set_clause = ", ".join(f"t.{c} = s.{c}" for c in columns)
    insert_cols = ", ".join(columns)
    insert_vals = ", ".join(f"s.{c}" for c in columns)

    spark.sql(
        f"""
        MERGE INTO {target} t
        USING cdc_updates s
        ON t.{key} = s.{key}
        WHEN MATCHED AND s.op = 'd' THEN DELETE
        WHEN MATCHED THEN UPDATE SET {set_clause}
        WHEN NOT MATCHED AND s.op != 'd' THEN INSERT ({insert_cols}) VALUES ({insert_vals})
        """
    )
    return flat.count()


def main() -> None:
    spark = SparkSession.builder.appName("openlakehouse-cdc-sync").getOrCreate()

    spark.sql("CREATE NAMESPACE IF NOT EXISTS catalog.bronze")
    spark.sql(
        """
        CREATE TABLE IF NOT EXISTS catalog.bronze.customers_cdc (
            id INT, name STRING, email STRING, created_at STRING
        ) USING iceberg
        """
    )
    spark.sql(
        """
        CREATE TABLE IF NOT EXISTS catalog.bronze.orders_cdc (
            id INT, customer_id INT, amount DOUBLE, status STRING, updated_at STRING
        ) USING iceberg
        """
    )

    customers_events = _sync_table(
        spark,
        topic="openlakehouse.cdc.customers",
        row_schema=CUSTOMERS_ROW,
        target="catalog.bronze.customers_cdc",
        key="id",
        columns=["id", "name", "email", "created_at"],
    )
    orders_events = _sync_table(
        spark,
        topic="openlakehouse.cdc.orders",
        row_schema=ORDERS_ROW,
        target="catalog.bronze.orders_cdc",
        key="id",
        columns=["id", "customer_id", "amount", "status", "updated_at"],
    )

    customers_count = spark.table("catalog.bronze.customers_cdc").count()
    orders_count = spark.table("catalog.bronze.orders_cdc").count()
    print(
        f"CDC_SYNC_OK customers_events={customers_events} orders_events={orders_events} "
        f"customers_cdc_count={customers_count} orders_cdc_count={orders_count}"
    )
    spark.stop()


if __name__ == "__main__":
    main()
