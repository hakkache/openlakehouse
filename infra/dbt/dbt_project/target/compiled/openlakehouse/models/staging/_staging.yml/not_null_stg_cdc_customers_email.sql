
    
    



select email
from "iceberg"."dbt_staging"."stg_cdc_customers"
where email is null


