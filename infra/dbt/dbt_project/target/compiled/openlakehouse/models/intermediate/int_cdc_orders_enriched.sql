-- Enriches each CDC order with its customer's name/email.
select
    o.order_id,
    o.customer_id,
    c.customer_name,
    c.email,
    o.amount,
    o.status,
    o.updated_at
from "iceberg"."dbt_staging"."stg_cdc_orders" o
left join "iceberg"."dbt_staging"."stg_cdc_customers" c
    on o.customer_id = c.customer_id