
    
    



select order_date
from "iceberg"."dbt_marts"."mart_daily_kafka_sales"
where order_date is null


