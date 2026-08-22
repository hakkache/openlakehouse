# 03 — Date Dimension

**Content type: PROJECT IMPLEMENTATION.**

## Why `dim_date` is special

Unlike every other dimension, `dim_date` isn't derived *from* a source
table — it's **generated** to cover the full range of dates your fact
tables will ever reference, independent of what data happens to exist yet.

## Hands-On Walkthrough — generate `dim_date` covering Olist's real range

1. First confirm the real date range you need to cover, in **SQL Editor**:
   ```sql
   SELECT min(order_purchase_timestamp), max(order_purchase_timestamp)
   FROM iceberg.bronze.olist_orders;
   ```
   **Expected result**: roughly `2016-09-04` to `2018-10-17` — the real
   Olist dataset's actual span.
2. In Jupyter, generate the dimension with a comfortable buffer around
   that real range:
   ```python
   from pyspark.sql.functions import (
       col, date_format, dayofweek, dayofmonth, month, quarter, year, expr
   )

   df = spark.sql("SELECT explode(sequence(to_date('2016-01-01'), to_date('2019-12-31'), interval 1 day)) AS full_date")
   df = (df
       .withColumn("date_key", date_format(col("full_date"), "yyyyMMdd").cast("int"))
       .withColumn("day_of_week", dayofweek(col("full_date")))
       .withColumn("day_name", date_format(col("full_date"), "EEEE"))
       .withColumn("day_of_month", dayofmonth(col("full_date")))
       .withColumn("month", month(col("full_date")))
       .withColumn("month_name", date_format(col("full_date"), "MMMM"))
       .withColumn("quarter", quarter(col("full_date")))
       .withColumn("year", year(col("full_date")))
       .withColumn("is_weekend", expr("day_of_week in (1,7)"))
   )
   df.writeTo("catalog.gold.dim_date").createOrReplace()
   print(df.count())
   ```
3. **Expected output**: `1461` (4 full years, including 2 leap years'
   worth of days — verify: 365*4 + 1 leap day for 2016 + 1 for... actually
   2016 and 2020 not both in range; 2016 is a leap year within range, so
   `1461` = 365*4 + 1).
4. Verify in **SQL Editor**:
   ```sql
   SELECT * FROM iceberg.gold.dim_date WHERE date_key = 20170704;
   ```
   **Expected result**: one row, `day_name = 'Tuesday'`,
   `is_weekend = false`, `quarter = 3`.

## Why `date_key` as an integer, not the date itself, as the join key

`yyyyMMdd` integer keys (`20170704`) sort and index efficiently, join
cleanly across engines with zero timezone-representation ambiguity, and
are what `fact_orders`/`fact_order_items` will store instead of a raw
timestamp column, once built in
[`08-scd-type-2-fundamentals.md`](08-scd-type-2-fundamentals.md) onward.

> 🧪 **Checkpoint**: `dim_date` has `1461` rows spanning 2016-2019, and
> `date_key = 20170704` returns exactly the expected calendar attributes.

## Next document

[`04-customer-dimension.md`](04-customer-dimension.md).
