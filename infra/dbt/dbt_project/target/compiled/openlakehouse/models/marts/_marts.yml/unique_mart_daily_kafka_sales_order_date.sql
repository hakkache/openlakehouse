
    
    

select
    order_date as unique_field,
    count(*) as n_records

from "iceberg"."dbt_marts"."mart_daily_kafka_sales"
where order_date is not null
group by order_date
having count(*) > 1


