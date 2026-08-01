
    
    



select order_id
from "iceberg"."dbt_staging"."stg_kafka_orders"
where order_id is null


