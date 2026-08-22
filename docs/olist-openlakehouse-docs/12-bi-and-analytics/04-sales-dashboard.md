# 04 — Sales Dashboard

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — sales performance by category and geography

1. **Chart**: dataset `fact_order_items` joined to `dim_products`, viz
   **Bar Chart**, dimension `product_category_name_english`, metric
   `SUM(price)`, sort descending, limit 10. Name it `Top 10 Categories
   by Revenue`.
2. **Chart**: dataset `fact_orders` joined to `dim_customers`, viz
   **Choropleth Map** (or **Bar Chart** if no geo shape file is
   configured), dimension `customer_state`, metric `SUM(total_order_value)`.
   Name it `Revenue by State`.
3. **Chart**: dataset `fact_orders`, viz **Time-series Line Chart**,
   time grain `Week`, metric `COUNT(*)`, to visualize real order-volume
   seasonality (Olist's real data shows a visible spike around
   Black Friday in November — check your own chart for this pattern).
4. Assemble into a `Sales Performance` dashboard.

## A real filter-interaction test

5. Add a **Dashboard Filter** on `product_category_name_english`, apply
   it, select one category (e.g. `bed_bath_table`, a real top category in
   this dataset). **Expected result**: all charts scoped to that category
   update in place — confirms native filter cross-charting works against
   your real Trino-backed data, not a static screenshot-like rendering.

> 🧪 **Checkpoint**: you can select any one product category via the
> dashboard filter and watch all 3 charts recompute live against real
> Trino queries.

## Next document

[`05-customer-dashboard.md`](05-customer-dashboard.md).
