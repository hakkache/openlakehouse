
  create or replace view
    "iceberg"."dbt_staging"."stg_olist_orders_1"
  security definer
  as
    

select
    order_id,
    customer_id,
    order_status,
    cast(order_purchase_timestamp as timestamp(6)) as order_purchase_ts,
    cast(order_delivered_customer_date as timestamp(6)) as order_delivered_ts,
    cast(order_estimated_delivery_date as timestamp(6)) as order_estimated_ts
from "iceberg"."bronze"."olist_orders"
  ;
