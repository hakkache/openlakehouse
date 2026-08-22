# 02 — Datasets, Models, and Metrics

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — connect Superset to Trino and register real Gold datasets

1. In Superset (`http://localhost:8088`), go to **Settings** →
   **Database Connections** → **+ Database**, choose **Trino**, and
   supply the real connection string:
   `trino://admin@trino:8080/iceberg/gold` (the same Trino coordinator
   this whole project uses — no separate BI-specific data copy).
2. Test the connection. **Expected result**: success — confirms Superset
   can reach the real Trino coordinator over the docker network.
3. **Datasets** → **+ Dataset**, choose the new Trino connection, schema
   `gold`, table `fact_orders`. Save.
4. Repeat for `fact_order_items`, `dim_customers`, `dim_date`,
   `dim_products`, `dim_sellers`.
5. On the `fact_orders` dataset's **Edit** page, add a real calculated
   metric: **Metrics** → **+ Add metric**, name `avg_order_value`,
   SQL expression `AVG(total_order_value)`, save.
6. Verify the metric works: create a throwaway chart (Big Number) on
   `fact_orders` using `avg_order_value`. **Expected result**: a real
   computed value (a genuine average from your actual 99441-row fact
   table, not a placeholder).

## Why registering datasets against Gold (not Silver/Bronze) is the right layer

Gold is the layer with real dimensional joins already resolved
(surrogate keys, `is_late`, conformed dimensions) — exactly what BI tools
are meant to consume, per the medallion architecture's own intent
established in
[`01-architecture/`](../01-architecture/). Pointing Superset at Silver or
Bronze would force every analyst to re-derive joins Superset shouldn't
need to know about.

> 🧪 **Checkpoint**: you connected Superset to the real Trino coordinator,
> registered 5 real Gold datasets, and confirmed a custom SQL metric
> computes a genuine value from your actual data.

## Next document

[`03-executive-dashboard.md`](03-executive-dashboard.md).
