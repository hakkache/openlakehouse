
  
    

    create table "iceberg"."dbt_marts"."mart_daily_kafka_sales__dbt_tmp"
      
      
    as (
      -- Daily sales rollup from the Kafka-streamed demo orders.
select
    date(created_at) as order_date,
    count(*) as order_count,
    sum(amount) as total_amount,
    avg(amount) as avg_order_amount
from "iceberg"."dbt_staging"."stg_kafka_orders"
group by 1
order by 1
    );

  