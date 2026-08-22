# 05 — Intermediate Models

**Content type: PROJECT IMPLEMENTATION.**

## What belongs in intermediate

Multi-table joins and reusable business logic that multiple marts will
need — not yet the final Gold/BI-facing shape, but no longer 1:1 with a
single source. `int_cdc_orders_enriched.sql` (already in this repo) is
the established precedent to follow.

## Hands-On Walkthrough — `int_olist_orders_with_revenue.sql`

1. First add the staging model this depends on,
   `models/staging/stg_olist_order_items.sql`:
   ```sql
   with source as (
       select * from {{ source('bronze', 'olist_order_items') }}
   )
   select order_id, order_item_id, product_id, seller_id,
          cast(price as decimal(10,2)) as price,
          cast(freight_value as decimal(10,2)) as freight_value
   from source
   ```
2. Create `models/intermediate/int_olist_orders_with_revenue.sql`:
   ```sql
   with orders as (
       select * from {{ ref('stg_olist_orders') }}
   ),
   items as (
       select order_id,
              sum(price) as total_price,
              sum(freight_value) as total_freight
       from {{ ref('stg_olist_order_items') }}
       group by order_id
   )
   select
       o.*,
       coalesce(i.total_price, 0) as total_price,
       coalesce(i.total_freight, 0) as total_freight,
       coalesce(i.total_price, 0) + coalesce(i.total_freight, 0) as total_order_value
   from orders o
   left join items i on o.order_id = i.order_id
   ```
   Note the `left join` + `coalesce` — the same zero-payment-order edge
   case from
   [`02-source-and-data-model/07-star-schema.md`](../02-source-and-data-model/07-star-schema.md)
   applies here too: an order with no `order_items` rows must not be
   silently dropped by an `inner join`.
3. Run: `docker compose exec dbt dbt run --select int_olist_orders_with_revenue`.
4. Verify: `SELECT count(*) FROM iceberg.<schema>.int_olist_orders_with_revenue;`
   **Expected result**: `99441` — every order present, confirming the
   `left join` preserved orders with zero items (the `inner join` version
   would show a slightly lower count — try it once and compare, then
   revert to `left join`).

## Why `ref()`, not a hardcoded table name

`{{ ref('stg_olist_orders') }}` makes dbt build a real dependency graph —
running `dbt run --select int_olist_orders_with_revenue+` (with the `+`)
automatically runs `stg_olist_orders` and `stg_olist_order_items` first,
in the correct order, without you managing that sequencing by hand.

> 🧪 **Checkpoint**: `int_olist_orders_with_revenue` has `99441` rows and
> you can explain, with a real before/after count, why `left join` was
> necessary instead of `inner join`.

## Next document

[`06-marts.md`](06-marts.md).
