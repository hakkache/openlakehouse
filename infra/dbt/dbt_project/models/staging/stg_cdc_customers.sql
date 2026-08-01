-- Staging model over the Phase 12 Debezium CDC-replicated cdc.customers table.
select
    id as customer_id,
    name as customer_name,
    email,
    from_iso8601_timestamp(created_at) as created_at
from {{ source('bronze', 'customers_cdc') }}
