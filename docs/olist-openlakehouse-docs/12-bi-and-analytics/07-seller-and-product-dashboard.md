# 07 — Seller and Product Dashboard

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — seller and product performance

1. **Chart**: dataset joining `fact_order_items` to `dim_sellers`, viz
   **Bar Chart**, dimension `seller_id` (or `seller_state`), metric
   `SUM(price)`, limit 10, sort descending. Name it `Top 10 Sellers by
   Revenue`.
2. **Chart**: dataset `fact_order_items`, viz **Scatter Plot**, x-axis
   `AVG(price)`, y-axis `COUNT(*)`, grouped by `seller_id` — reveals real
   seller segments (high-volume/low-price vs. low-volume/high-price
   sellers), a genuine exploratory insight, not a scripted one.
3. **Chart**: dataset joining `fact_order_items` to `dim_products`, viz
   **Bar Chart**, dimension `product_category_name_english`, metric
   `AVG(price)`, sort descending, limit 10. Name it `Highest-Priced
   Categories`.
4. **Chart**: reuse your quality-check table from
   [`10-data-quality/07-quality-dashboard.md`](../10-data-quality/07-quality-dashboard.md)
   — dataset `gold.quality_check_results`, viz **Table**, all columns.
   Name it `Data Quality Status` — this is a genuinely useful thing to
   put on a BI dashboard for data-team consumption, not just
   business-facing metrics.
5. Assemble into a `Seller & Product Insights` dashboard, including the
   quality-status table as its final panel.

> 🧪 **Checkpoint**: your dashboard combines both business metrics
> (seller/product revenue) and a real data-quality status table sourced
> from module 10's own verified check results — one dashboard serving
> both business and data-engineering audiences.

## Next document

[`08-advanced-analytics.md`](08-advanced-analytics.md).
