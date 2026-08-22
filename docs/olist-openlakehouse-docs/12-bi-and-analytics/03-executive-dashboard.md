# 03 — Executive Dashboard

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — build a real executive summary dashboard

1. **Charts** → **+ Chart**, dataset `fact_orders`, viz type **Big
   Number**, metric `COUNT(*)`. Name it `Total Orders`. Save.
   **Expected result**: displays `99441` — matches the real row count
   verified throughout modules 02-07.
2. Add a **Big Number** chart, dataset `fact_orders`, metric
   `avg_order_value` (from doc 02). Name it `Avg Order Value`.
3. Add a **Time-series Line Chart**: dataset `fact_orders` joined with
   `dim_date` (or use `fact_orders`'s own purchase-date column if
   denormalized), metric `SUM(total_order_value)`, time grain `Month`.
   Name it `Monthly Revenue`. **Expected result**: a real trend line
   spanning the actual Olist date range (2016-09 to 2018-10, per
   established real data facts).
4. Add a **Big Number** chart: dataset `fact_orders`, metric
   `AVG(CASE WHEN is_late THEN 1.0 ELSE 0.0 END) * 100` (custom SQL
   metric), name it `Late Delivery Rate %`.
5. Create a new Dashboard, `Executive Summary`, and drag all 4 charts
   onto it. Save.
6. Confirm it appears on `http://localhost/dashboards` (per
   [`01-superset-architecture.md`](01-superset-architecture.md)'s
   verified proxy).

## Interpreting the real numbers

Your `Late Delivery Rate %` should be a real, non-trivial percentage
(commonly cited as ~7-8% for this public dataset, though your exact
number depends on your own `is_late` derivation from module 04) — this is
a genuine business insight, not a demo placeholder, and matches the kind
of number a real Olist operations team would track daily.

> 🧪 **Checkpoint**: your Executive Summary dashboard shows 4 real
> metrics computed from your own Gold-layer data, and is visible in the
> OpenLakehouse app's Dashboards page.

## Next document

[`04-sales-dashboard.md`](04-sales-dashboard.md).
