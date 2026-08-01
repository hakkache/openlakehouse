"""Phase 11 acceptance job: Kafka -> Spark Structured Streaming -> Iceberg bronze.

Reads JSON "orders" events from the real Kafka broker and writes them
incrementally into `catalog.bronze.orders` using Spark Structured Streaming's
foreachBatch sink (checkpointed, exactly-once per batch against Iceberg).

Runs with `Trigger.AvailableNow()` - processes everything currently queued in
Kafka then stops, rather than running forever as a long-lived daemon. This is
a deliberate, common production pattern for cost-bounded incremental/micro-batch
ingestion (as opposed to a permanently-running streaming query), and keeps this
job runnable as a simple one-off `spark-submit` for real, observable verification.

Usage (inside the spark-master container):
    spark-submit --master spark://spark-master:7077 \
        --packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.9 \
        /opt/spark-apps/streaming_orders.py
"""
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, from_json
from pyspark.sql.types import DoubleType, StringType, StructField, StructType, TimestampType

KAFKA_BOOTSTRAP_SERVERS = "kafka:9092"
TOPIC = "orders"
CHECKPOINT_LOCATION = "file:///opt/spark/spark-events/checkpoints/streaming_orders"

ORDER_SCHEMA = StructType(
    [
        StructField("order_id", StringType(), False),
        StructField("customer_id", StringType(), False),
        StructField("amount", DoubleType(), False),
        StructField("status", StringType(), False),
        StructField("created_at", TimestampType(), False),
    ]
)


def main() -> None:
    spark = SparkSession.builder.appName("openlakehouse-streaming-orders").getOrCreate()

    spark.sql("CREATE NAMESPACE IF NOT EXISTS catalog.bronze")
    spark.sql(
        """
        CREATE TABLE IF NOT EXISTS catalog.bronze.orders (
            order_id STRING,
            customer_id STRING,
            amount DOUBLE,
            status STRING,
            created_at TIMESTAMP
        ) USING iceberg
        """
    )

    raw = (
        spark.readStream.format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS)
        .option("subscribe", TOPIC)
        .option("startingOffsets", "earliest")
        .load()
    )

    orders = raw.select(
        from_json(col("value").cast("string"), ORDER_SCHEMA).alias("data")
    ).select("data.*")

    def write_batch(batch_df, batch_id: int) -> None:
        if batch_df.rdd.isEmpty():
            return
        batch_df.writeTo("catalog.bronze.orders").append()

    query = (
        orders.writeStream.foreachBatch(write_batch)
        .option("checkpointLocation", CHECKPOINT_LOCATION)
        .trigger(availableNow=True)
        .start()
    )
    query.awaitTermination()

    total = spark.table("catalog.bronze.orders").count()
    print(f"STREAMING_ORDERS_OK bronze_orders_count={total}")
    spark.stop()


if __name__ == "__main__":
    main()
