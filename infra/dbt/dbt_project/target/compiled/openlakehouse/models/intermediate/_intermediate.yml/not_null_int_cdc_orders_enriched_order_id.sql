
    
    



select order_id
from "iceberg"."dbt_intermediate"."int_cdc_orders_enriched"
where order_id is null


