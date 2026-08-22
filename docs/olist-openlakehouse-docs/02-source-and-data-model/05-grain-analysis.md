# 05 — Grain Analysis

**Content type: PROJECT IMPLEMENTATION** (the single most important
modeling exercise in this dataset).

## Purpose

Formally define the grain (the meaning of "one row") for every source
table and every planned dimension/fact table, since grain mismatches are
the root cause of the majority of dimensional-modeling bugs.

## What "grain" means and why it's decided first

Kimball's rule: **declare the grain before choosing dimensions or
measures.** Every fact table row must represent exactly one thing at one
level of detail — mixing grains in one fact table (e.g. some rows at
order level, some at item level) breaks every `SUM()` in every downstream
report silently.

## Source table grains (as distributed)

| Table | Grain statement |
|---|---|
| `orders` | one row = one order |
| `order_items` | one row = one line item within one order |
| `order_payments` | one row = one payment installment/method applied to one order |
| `order_reviews` | one row = one review submitted for one order |
| `customers` | one row = one **order's** customer record (not one person) |
| `products` | one row = one product |
| `sellers` | one row = one seller |

## Planned dimension/fact grains (this project's design)

| Table | Grain statement | Natural key used |
|---|---|---|
| `dim_customers` | one row per version of one **person** (`customer_unique_id`) over time (SCD2) | `customer_unique_id` + effective date range |
| `dim_sellers` | one row per version of one seller over time (SCD2) | `seller_id` + effective date range |
| `dim_products` | one row per product (SCD1 — see `07-dimensional-modeling/02-scd-types-overview.md` for why Type 1 is sufficient here) | `product_id` |
| `dim_date` | one row per calendar day | `date` |
| `fact_orders` | one row per order | `order_id` |
| `fact_order_items` | one row per order line item | `order_id` + `order_item_id` |

## Why `dim_customers` requires re-grain-ing from source

The source `customers` table's grain (one row per order's customer
record) does **not** match the dimension's intended grain (one row per
distinct person-version). Building `dim_customers` therefore requires an
explicit `GROUP BY customer_unique_id` (or dedup keeping one representative
row per unique_id + its own zip/city/state) — this is not a trivial
"copy the source table" pipeline, it's a genuine grain transformation, and
it's exactly why `01-olist-dataset.md`'s trap matters operationally, not
just conceptually.

## Why two fact tables, not one (grain conflict if combined)

`fact_orders` (order grain) and `fact_order_items` (item grain) cannot be
merged into one fact table without either (a) duplicating order-level
measures (like payment totals) across every item row — corrupting any
naive `SUM()` — or (b) losing item-level detail. This is the concrete
grain-conflict justification behind ADR-004
(`01-architecture/09-architecture-decisions.md`).

## Next document

[`06-dimensional-modeling.md`](06-dimensional-modeling.md).
