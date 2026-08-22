{{ config(materialized='view') }}

select
    order_id,
    customer_id,
    order_status,
    cast(order_purchase_timestamp as timestamp) as order_purchase_ts,
    cast(order_delivered_customer_date as timestamp) as order_delivered_ts,
    cast(order_estimated_delivery_date as timestamp) as order_estimated_ts
from {{ source('bronze', 'olist_orders') }}