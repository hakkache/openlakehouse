-- Staging model over the Phase 11 Kafka-streamed demo orders (iceberg.bronze.orders).
-- Deduped by order_id: the streaming ingest job can re-process/re-write the same
-- Kafka message across job restarts, producing exact-duplicate rows in the bronze
-- table. Keep one row per order_id (latest by created_at) to make this model reliable.
with source as (
    select
        order_id,
        customer_id,
        amount,
        status,
        cast(created_at as timestamp) as created_at
    from {{ source('bronze', 'orders') }}
),

deduped as (
    select
        *,
        row_number() over (partition by order_id order by created_at desc) as rn
    from source
)

select
    order_id,
    customer_id,
    amount,
    status,
    created_at
from deduped
where rn = 1
