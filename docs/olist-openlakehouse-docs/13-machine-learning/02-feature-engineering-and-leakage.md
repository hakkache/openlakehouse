# 02 — Feature Engineering and Leakage

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — build a real, leakage-free feature mart

1. Build a Gold-layer mart with only purchase-time-known features (via
   Pipeline Builder or dbt — this example uses dbt, mirroring
   [`06-dbt/06-marts.md`](../06-dbt/06-marts.md)'s pattern), saved as
   `infra/dbt/dbt_project/models/marts/mart_late_delivery_features.sql`:
   ```sql
   {{ config(materialized='table') }}
   SELECT
       f.order_id,
       c.customer_state,
       s.seller_state,
       p.product_category_name_english,
       oi.price,
       oi.freight_value,
       extract(dow FROM f.order_purchase_timestamp) AS purchase_day_of_week,
       (c.customer_state <> s.seller_state) AS cross_state_shipment,
       f.is_late
   FROM {{ source('gold', 'fact_orders') }} f
   JOIN {{ source('gold', 'fact_order_items') }} oi ON f.order_id = oi.order_id
   JOIN {{ source('gold', 'dim_customers') }} c ON f.customer_key = c.customer_key
   JOIN {{ source('gold', 'dim_sellers') }} s ON oi.seller_key = s.seller_key
   JOIN {{ source('gold', 'dim_products') }} p ON oi.product_key = p.product_key
   WHERE f.is_late IS NOT NULL
   ```
2. `docker compose exec dbt dbt run --select mart_late_delivery_features
   --project-dir dbt_project --profiles-dir profiles`.
3. Verify: `SELECT count(*) FROM iceberg.dbt_marts.mart_late_delivery_features;`
   **Expected result**: matches your doc 01 count (excludes undelivered
   orders, per the `WHERE is_late IS NOT NULL` filter).

## The one leakage trap worth deliberately testing

4. **Negative test**: temporarily add a genuinely leaky feature —
   `date_diff('day', f.order_purchase_timestamp,
   f.order_delivered_customer_date) AS delivery_days` — to the mart above,
   train a model on it (jump ahead informally, or wait for doc 03), and
   observe: this feature would make the model look almost perfectly
   accurate, because it's *derived from* the very delivery event you're
   trying to predict before it happens — a textbook, reproducible leakage
   example. Remove it before finalizing the mart.

> 🧪 **Checkpoint**: you built a real feature mart containing only
> purchase-time-known columns, and can explain concretely why
> `delivery_days` would be leakage if included.

## Next document

[`03-model-training-and-evaluation.md`](03-model-training-and-evaluation.md).
