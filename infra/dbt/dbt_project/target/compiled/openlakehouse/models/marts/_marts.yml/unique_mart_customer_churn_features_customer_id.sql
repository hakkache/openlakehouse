
    
    

select
    customer_id as unique_field,
    count(*) as n_records

from "iceberg"."dbt_marts"."mart_customer_churn_features"
where customer_id is not null
group by customer_id
having count(*) > 1


