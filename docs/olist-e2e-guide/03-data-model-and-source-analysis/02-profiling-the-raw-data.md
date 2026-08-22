# 02 — Profiling the Raw Data

## Hands-On Walkthrough — profile the real data yourself with pandas

1. In Jupyter (`http://localhost:8888` or your mapped port), open a new
   notebook, load and profile:
   ```python
   import pandas as pd
   orders = pd.read_csv('/path/to/olist_orders_dataset.csv')
   print(len(orders))                       # expect 99441
   customers = pd.read_csv('/path/to/olist_customers_dataset.csv')
   print(customers['customer_id'].nunique())        # expect 99441
   print(customers['customer_unique_id'].nunique())  # expect 96096
   ```
2. Confirm the real date range:
   ```python
   orders['order_purchase_timestamp'] = pd.to_datetime(orders['order_purchase_timestamp'])
   print(orders['order_purchase_timestamp'].min(), orders['order_purchase_timestamp'].max())
   ```
   **Expected result**: roughly `2016-09-04` to `2018-10-17`.
3. Profile every table's null rates in one pass:
   ```python
   for col in orders.columns:
       pct_null = orders[col].isna().mean() * 100
       print(f"{col}: {pct_null:.1f}% null")
   ```
   **Expected result**: `order_delivered_customer_date` and
   `order_delivered_carrier_date` show real non-zero null rates
   (undelivered/canceled orders) — everything else near `0%`.

## Comparing a naive vs. correct approach (a recurring pattern in this guide)

| Approach | Result | Why it matters |
|---|---|---|
| `orders['customer_id'].nunique()` | 99,441 | wrong answer to "how many customers" |
| `customers['customer_unique_id'].nunique()` | 96,096 | correct answer |

> 🧪 **Checkpoint**: you have your own real numbers for row counts, null
> rates, and the date range, matching the table in doc 01 — write them
> down, you'll cross-check against them in every later module.

## Next document

[`03-data-quality-quirks.md`](03-data-quality-quirks.md).
