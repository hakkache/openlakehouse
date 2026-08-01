-- Customer-level churn features derived from the Kafka-streamed demo orders
-- (iceberg.dbt_staging.stg_kafka_orders). Label: a customer is considered
-- "churned" if their most recent order status is CANCELLED (a real signal
-- present in the demo data), otherwise active.
with customer_orders as (
    select
        customer_id,
        count(*) as order_count,
        sum(amount) as total_amount,
        avg(amount) as avg_order_amount,
        max(created_at) as last_order_at
    from {{ ref('stg_kafka_orders') }}
    group by customer_id
),

last_status as (
    select
        customer_id,
        status as last_status
    from (
        select
            customer_id,
            status,
            row_number() over (partition by customer_id order by created_at desc) as rn
        from {{ ref('stg_kafka_orders') }}
    )
    where rn = 1
)

select
    co.customer_id,
    co.order_count,
    co.total_amount,
    co.avg_order_amount,
    co.last_order_at,
    ls.last_status,
    case when ls.last_status = 'CANCELLED' then 1 else 0 end as churned
from customer_orders co
join last_status ls on co.customer_id = ls.customer_id
