
    
    



select customer_id
from "iceberg"."dbt_staging"."stg_cdc_customers"
where customer_id is null


