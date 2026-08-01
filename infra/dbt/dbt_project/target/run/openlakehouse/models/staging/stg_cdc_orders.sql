
  
    

    create table "iceberg"."dbt_staging"."stg_cdc_orders__dbt_tmp"
      
      
    as (
      -- Staging model over the Phase 12 Debezium CDC-replicated cdc.orders table.
select
    id as order_id,
    customer_id,
    amount,
    status,
    from_iso8601_timestamp(updated_at) as updated_at
from "iceberg"."bronze"."orders_cdc"
    );

  