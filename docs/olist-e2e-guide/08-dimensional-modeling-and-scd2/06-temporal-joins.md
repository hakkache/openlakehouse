# 06 — Temporal Joins

## Scenario 6 (Complex) — current-only vs. temporally-correct joins

1. Query a fact row joined to `dim_sellers_scd2` two ways:

**(a) Current-only join** (the common, easy-to-write-wrong pattern):
```sql
SELECT f.order_id, d.seller_city
FROM fact_order_items f
JOIN dim_sellers_scd2 d ON f.seller_key = d.seller_key AND d.is_current = true
```

**(b) Real temporal join** (correct for historical reporting):
```sql
SELECT f.order_id, d.seller_city
FROM fact_order_items f
JOIN dim_sellers_scd2 d ON f.seller_key = d.seller_key
  AND f.order_date >= d.valid_from AND f.order_date < d.valid_to
```

2. **Expected result**: for an order placed *before* a seller's city
   change, (a) gives the wrong (current) city while (b) gives the
   historically correct one — a concrete, visible difference, not a
   theoretical one.

## Comparison table

| Join style | Correct for "what is the seller's city today"? | Correct for "what was the seller's city on the order date"? |
|---|---|---|
| Current-only (`is_current = true`) | Yes | No |
| Temporal (`valid_from`/`valid_to` range) | No (need a separate current-only query) | Yes |

> 🧪 **Checkpoint**: you have one real order where the current-only join
> and the temporal join return **different** seller cities, and you can
> explain why the temporal one is the historically correct answer.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../09-orchestration-dagster/00-index.md`](../09-orchestration-dagster/00-index.md).
