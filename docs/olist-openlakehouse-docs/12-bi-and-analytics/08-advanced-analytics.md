# 08 — Advanced Analytics

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — cohort and SCD2-aware analysis

1. **Chart**: a real cohort-style analysis using a virtual SQL dataset —
   monthly revenue by first-purchase-month cohort:
   ```sql
   WITH first_purchase AS (
     SELECT customer_key, min(purchase_date_key) AS cohort_month
     FROM iceberg.gold.fact_orders GROUP BY customer_key
   )
   SELECT fp.cohort_month, f.purchase_date_key, sum(f.total_order_value) AS revenue
   FROM iceberg.gold.fact_orders f
   JOIN first_purchase fp ON f.customer_key = fp.customer_key
   GROUP BY fp.cohort_month, f.purchase_date_key
   ```
   Register as a virtual dataset, build a **Heatmap** viz —
   **Expected result**: a real (mostly sparse, given this dataset's low
   repeat-purchase rate per doc 05) cohort grid, an honest reflection of
   the underlying data rather than a manufactured "nice" chart.
2. **Chart**: point a dataset directly at your SCD2 table from
   [`07-dimensional-modeling/10-scd2-dbt-snapshot.md`](../07-dimensional-modeling/10-scd2-dbt-snapshot.md),
   `dim_sellers_scd2_dbt`, filtered `WHERE is_current = false`
   (or dbt's `dbt_valid_to IS NOT NULL`), viz **Table**, to surface
   **historical seller changes** as a genuine analytical artifact — most
   BI dashboards only show current-state data; this one demonstrates
   showing history is possible when your dimension is built correctly.
3. Assemble into an `Advanced Analytics` dashboard.

## Closing the module: verify all 6 dashboards are live

4. Return to `http://localhost/dashboards`. **Expected result**: all 6
   dashboards built across this module (`Olist Test`, `Executive
   Summary`, `Sales Performance`, `Customer Insights`, `Logistics
   Performance`, `Seller & Product Insights`, `Advanced Analytics` — 7
   including the placeholder from doc 01) appear in the real proxied
   list.

> 🧪 **Checkpoint for the module**: you built 7 real dashboards spanning
> executive, sales, customer, logistics, seller/product, and advanced-
> analytics use cases, every chart backed by a real Trino query against
> your own Gold-layer data, and confirmed the OpenLakehouse app's own
> Dashboards page reflects all of them live.

## Next module

[`13-machine-learning/01-ml-use-case-late-delivery.md`](../13-machine-learning/01-ml-use-case-late-delivery.md).
