"""Phase 3 supplemental test: explicitly exercises Iceberg time travel and
schema evolution against the real Polaris + MinIO backed table created by
test_iceberg.py. Prints markers consumed by automated verification.
"""
from pyspark.sql import SparkSession


def main() -> None:
    spark = SparkSession.builder.appName("openlakehouse-phase3-advanced-test").getOrCreate()

    history = spark.sql("SELECT snapshot_id, made_current_at FROM catalog.bronze.test.history ORDER BY made_current_at").collect()
    assert len(history) >= 2, f"expected at least 2 history entries, got {len(history)}"
    first_snapshot_id = history[0]["snapshot_id"]

    # Time travel: read the table as of its very first snapshot.
    time_travel_count = spark.read.option("snapshot-id", first_snapshot_id).table("catalog.bronze.test").count()
    print(f"PHASE3_TIME_TRAVEL_OK first_snapshot_id={first_snapshot_id} count_at_first_snapshot={time_travel_count}")

    # Schema evolution: confirm the 'label' column added earlier is visible.
    columns = spark.table("catalog.bronze.test").columns
    assert "label" in columns, f"expected 'label' column from schema evolution, got {columns}"
    print(f"PHASE3_SCHEMA_EVOLUTION_OK columns={columns}")

    # MERGE test.
    spark.sql("CREATE TABLE IF NOT EXISTS catalog.bronze.merge_source (id BIGINT, label STRING) USING ICEBERG")
    spark.sql("INSERT OVERWRITE catalog.bronze.merge_source VALUES (100, 'merged'), (200, 'new')")
    spark.sql(
        """
        MERGE INTO catalog.bronze.test t
        USING catalog.bronze.merge_source s
        ON t.id = s.id
        WHEN MATCHED THEN UPDATE SET t.label = s.label
        WHEN NOT MATCHED THEN INSERT (id, label) VALUES (s.id, s.label)
        """
    )
    merged_label = spark.sql("SELECT label FROM catalog.bronze.test WHERE id = 100").collect()[0]["label"]
    assert merged_label == "merged", f"expected 'merged', got {merged_label}"
    new_row_count = spark.sql("SELECT count(*) as c FROM catalog.bronze.test WHERE id = 200").collect()[0]["c"]
    assert new_row_count == 1, f"expected 1 row for id=200, got {new_row_count}"
    print("PHASE3_MERGE_OK")

    # DELETE test.
    spark.sql("DELETE FROM catalog.bronze.test WHERE id = 200")
    remaining = spark.sql("SELECT count(*) as c FROM catalog.bronze.test WHERE id = 200").collect()[0]["c"]
    assert remaining == 0, f"expected 0 rows for id=200 after delete, got {remaining}"
    print("PHASE3_DELETE_OK")

    spark.stop()


if __name__ == "__main__":
    main()
