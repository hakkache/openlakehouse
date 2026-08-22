# 03 — Data Quality Quirks You Must Design Around

## Quirk 1 — orders with zero payment rows

```python
payments = pd.read_csv('/path/to/olist_order_payments_dataset.csv')
orders_with_payments = payments['order_id'].nunique()
print(len(orders) - orders_with_payments)
```
**Expected result**: a small non-zero number — real orders with **no**
payment row at all. **Design rule**: always `LEFT JOIN` orders to
payments, never `INNER JOIN`, and `COALESCE` the aggregated total to `0`.

## Quirk 2 — duplicate review IDs

```python
reviews = pd.read_csv('/path/to/olist_order_reviews_dataset.csv')
print(len(reviews), reviews['review_id'].nunique())
```
**Expected result**: `len(reviews) > nunique` — real duplicate
`review_id`s exist. **Design rule**: always deduplicate reviews before
joining them to anything (module 06, doc 06 shows the exact fix).

## Quirk 3 — misleading pre-aggregated-looking columns (a lesson, not literally present in Olist, but worth testing for)

Before trusting **any** column that looks like a running total or
pre-computed aggregate in a raw source, verify it's actually
monotonic/consistent per key:
```python
# generic check pattern - apply to any suspicious "total_x" column
sample_id = orders['customer_id'].iloc[0]
print(orders[orders['customer_id'] == sample_id][['order_purchase_timestamp']])
```
**Design rule**: recompute aggregates yourself from granular facts
(`SUM(...)`, `COUNT(...)`) — never trust a pre-computed column from a raw
source without verifying it first.

## Quirk 4 — `customer_id` vs `customer_unique_id` (from doc 01, repeated here as a design rule)

Any "distinct customers" metric **must** use `customer_unique_id`.
Verify this is correctly applied every time you build a customer
dimension in module 08.

## Summary table — quirk → design rule → which module enforces it

| Quirk | Design rule | Enforced in |
|---|---|---|
| Orders without payments | `LEFT JOIN` + `COALESCE` | modules 06, 07 |
| Duplicate review IDs | `deduplicate` before joining | module 06 doc 06 |
| Pre-aggregated columns | recompute from granular facts | modules 07, 08 |
| `customer_id` ≠ real customer | dimension keyed on `customer_unique_id` | module 08 |

> 🧪 **Checkpoint**: you've personally reproduced all 4 quirks above with
> real numbers, and can state the correct design rule for each without
> looking it up.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../04-bronze-ingestion/00-index.md`](../04-bronze-ingestion/00-index.md).
