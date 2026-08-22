# 02 — Ingesting All 9 Tables

## Hands-On Walkthrough

1. Open Jupyter (`http://localhost:8888` or your mapped port), create
   `01-bronze-ingestion.ipynb`.
2. Ingest one table completely, verifying schema + count:
   ```python
   df = spark.read.csv('/data/olist_customers_dataset.csv', header=True, inferSchema=True)
   df.printSchema()
   print(df.count())  # expect 99441
   spark.sql("CREATE NAMESPACE IF NOT EXISTS catalog.bronze")
   df.writeTo("catalog.bronze.olist_customers").createOrReplace()
   ```
3. Repeat for the remaining 8 tables, tracking each in the table below as
   you go:

| Table | Expected row count | Ingested? |
|---|---|---|
| `olist_customers` | 99,441 | ☐ |
| `olist_orders` | 99,441 | ☐ |
| `olist_order_items` | 112,650 | ☐ |
| `olist_order_payments` | 103,886 | ☐ |
| `olist_order_reviews` | 104,162 | ☐ |
| `olist_products` | 32,951 | ☐ |
| `olist_sellers` | 3,095 | ☐ |
| `olist_geolocation` | 1,000,163 | ☐ |
| `product_category_name_translation` | 71 | ☐ |

4. Verify every table landed with exact real row counts via Trino:
   ```sql
   SELECT 'olist_customers' t, count(*) FROM iceberg.bronze.olist_customers
   UNION ALL SELECT 'olist_orders', count(*) FROM iceberg.bronze.olist_orders
   UNION ALL SELECT 'olist_order_items', count(*) FROM iceberg.bronze.olist_order_items;
   ```
   **Expected result**: `99441`, `99441`, `112650` — exact matches.

> 🧪 **Checkpoint**: all 9 tables exist in `iceberg.bronze`, with every
> row in the checklist above ticked and cross-checked against Trino.

## Next document

[`03-immutability-and-failure-drills.md`](03-immutability-and-failure-drills.md).
