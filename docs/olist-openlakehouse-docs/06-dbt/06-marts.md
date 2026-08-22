# 06 — Marts

**Content type: PROJECT IMPLEMENTATION.**

## What belongs in marts

BI/business-facing final tables — this is dbt's version of Gold. Existing
precedent: `mart_customer_order_summary.sql`,
`mart_daily_kafka_sales.sql`.

## Hands-On Walkthrough — `mart_olist_order_summary.sql`

1. Create `models/marts/mart_olist_order_summary.sql`:
   ```sql
   with orders as (
       select * from {{ ref('int_olist_orders_with_revenue') }}
   )
   select
       date_trunc('month', order_purchase_ts) as order_month,
       order_status,
       count(*) as order_count,
       sum(total_order_value) as gross_revenue,
       avg(total_order_value) as avg_order_value
   from orders
   group by 1, 2
   order by 1, 2
   ```
2. Run: `docker compose exec dbt dbt run --select mart_olist_order_summary`.
3. Verify in **SQL Editor**:
   ```sql
   SELECT * FROM iceberg.<schema>.mart_olist_order_summary
   ORDER BY order_month, order_status LIMIT 10;
   ```
   **Expected result**: real monthly rows spanning 2016-2018 (Olist's
   real date range), with plausible `gross_revenue` figures — this is a
   real, presentable business report, built entirely in dbt.
4. Run the whole dependency chain from scratch to prove `ref()` ordering
   works unaided:
   ```powershell
   docker compose exec dbt dbt run --select +mart_olist_order_summary
   ```
   **Expected result**: dbt's own console output lists all 3 models
   (`stg_olist_orders`, `stg_olist_order_items` — wait, only
   `int_olist_orders_with_revenue`'s direct ancestors — plus
   `int_olist_orders_with_revenue` itself, plus the mart) executed in
   correct dependency order, in one command.

> 🧪 **Checkpoint**: `mart_olist_order_summary` has real monthly revenue
> numbers, and one `dbt run --select +<mart>` command rebuilt its entire
> dependency chain correctly ordered.

## Next document

[`07-tests.md`](07-tests.md).
