# 06 — Logistics Dashboard

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — delivery performance

1. **Chart**: dataset `fact_orders`, viz **Big Number**, metric
   `AVG(date_diff('day', order_purchase_timestamp,
   order_delivered_customer_date))` (real average delivery days,
   excluding undelivered `NULL` rows automatically via SQL's null-
   propagation in the aggregate). Name it `Avg Delivery Days`.
2. **Chart**: viz **Bar Chart**, dimension `customer_state` (join
   `dim_customers`), metric same as above. Name it `Avg Delivery Days
   by State`. **Expected result**: a real, visible geographic pattern —
   northern/remote Brazilian states typically show longer delivery times
   than São Paulo (`SP`) in this real dataset; verify this pattern in
   your own chart rather than assuming it.
3. **Chart**: viz **Bar Chart**, dimension `is_late`, metric `COUNT(*)`,
   to visualize the on-time vs. late split as absolute counts (companion
   to doc 03's percentage Big Number).
4. Assemble into a `Logistics Performance` dashboard.

## Cross-check against a direct SQL query (never trust a chart blindly)

5. Before trusting step 2's chart, verify its top/bottom state directly
   in **SQL Editor**:
   ```sql
   SELECT c.customer_state, avg(date_diff('day', f.order_purchase_timestamp, f.order_delivered_customer_date)) AS avg_days
   FROM iceberg.gold.fact_orders f JOIN iceberg.gold.dim_customers c ON f.customer_key = c.customer_key
   WHERE f.order_delivered_customer_date IS NOT NULL
   GROUP BY c.customer_state ORDER BY avg_days DESC LIMIT 5;
   ```
   **Expected result**: matches the chart's own ranking exactly — a real
   sanity check confirming the BI tool's rendering agrees with a raw SQL
   query against the same table.

> 🧪 **Checkpoint**: you independently verified your dashboard's top-5
> slowest-delivery states against a raw SQL query, and both agree.

## Next document

[`07-seller-and-product-dashboard.md`](07-seller-and-product-dashboard.md).
