-- Per-customer order summary from the CDC-replicated orders/customers.
select
    customer_id,
    customer_name,
    email,
    count(*) as order_count,
    sum(amount) as total_amount,
    max(updated_at) as last_order_update
from {{ ref('int_cdc_orders_enriched') }}
group by 1, 2, 3
order by 1
