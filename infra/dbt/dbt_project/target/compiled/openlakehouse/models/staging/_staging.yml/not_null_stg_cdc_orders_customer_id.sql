
    
    



select customer_id
from "iceberg"."dbt_staging"."stg_cdc_orders"
where customer_id is null


