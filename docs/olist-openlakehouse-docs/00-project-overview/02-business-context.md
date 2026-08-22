# 02 — Business Context

**Content type: PROJECT IMPLEMENTATION** (business framing for the Olist
project; grounded in the real Kaggle dataset's real columns/semantics).

## Purpose

Explain the business behind the data, so every technical decision later in
this repository has a "why does this matter to the business" answer ready
for an architecture review or interview.

## The business: Olist, a marketplace, not a retailer

Olist is a **marketplace**: it doesn't sell products itself, it connects
independent **sellers** to customers across Brazil and handles logistics,
payments, and reviews centrally. This distinction matters constantly
throughout the model:

- There is no single "Olist warehouse" shipping speed — **delivery
  performance is a seller/logistics-lane property**, which is exactly why
  `dim_sellers` (with its city/state) and a seller-to-customer geography
  angle matter for the Logistics Dashboard (`12-bi-and-analytics/06-logistics-dashboard.md`).
- Orders can contain items from **multiple sellers** conceptually (though
  in this dataset each `order_item` row already carries its own
  `seller_id`) — so seller-level revenue and order-level revenue are two
  different, both-valid business metrics (see
  `02-source-and-data-model/08-business-metrics.md` for the additive-measure
  distinction this implies).

## Core business questions this project must answer

These are the same questions carried through Section 32 of the master
request, refined to what this dataset can actually answer:

**Sales**
- Which product categories generate the most revenue, and how has monthly
  revenue trended? (`fact_order_items` × `dim_products` × `dim_date`)
- Which states generate the most orders? (`fact_orders` × `dim_customers`)

**Customers**
- What fraction of shoppers are repeat customers (by `customer_unique_id`,
  **not** `customer_id` — see `02-source-and-data-model/05-grain-analysis.md`)?
- Where geographically is the customer base concentrated?

**Logistics**
- Which states have the worst on-time delivery rate?
- Is there a relationship between freight cost and order value/profitability?

**Sellers**
- Which sellers have the highest revenue and best delivery performance?
- Are there sellers whose orders are disproportionately late or cancelled?

**Products**
- Which categories have high sales but poor review scores (a real signal of
  a category needing quality intervention)?

**Predictive**
- Can we predict, **at order-placement time** (no data leakage from
  delivery outcomes), whether a new order is likely to be delivered late?
  (`13-machine-learning/`)

## Why this maps to a Kimball star schema (not a single flat table)

A marketplace's core entities — customers, sellers, products, calendar time
— are genuinely **reused across many facts** (an order references all four;
a review references an order; a payment references an order). Kimball
dimensional modeling exists specifically to avoid re-deriving these shared
entities' attributes inside every fact query, and to give BI tools a
predictable join shape (star schema) they can auto-generate SQL against.
See `07-dimensional-modeling/01-dimensional-modeling-fundamentals.md` for
the full rationale, and
`01-architecture/09-architecture-decisions.md` (ADR-003) for why Kimball
specifically (vs. e.g. Data Vault) was chosen for this project.

## Business impact of getting this wrong

Two concrete, dataset-grounded examples that recur throughout this
repository as cautionary "why we test for this" material:

1. **Wrong customer grain** (keying `dim_customers` on `customer_id`
   instead of `customer_unique_id`): every business question about
   "repeat customers" silently returns 0% repeat rate, because Olist's raw
   data gives every order a fresh `customer_id`. This isn't a hypothetical
   — it's the #1 documented trap in this exact dataset (see
   `02-source-and-data-model/01-olist-dataset.md`).
2. **Wrong SCD2 dimension join** (joining a fact to a dimension's *current*
   row instead of the row that was current *at the time of the fact
   event*): every historical revenue-by-state report silently reattributes
   old orders to a customer's current state after they've moved, corrupting
   trend analysis with no visible error — see
   `07-dimensional-modeling/14-scd2-fact-lookup-and-temporal-joins.md`.

## Next document

[`03-functional-requirements.md`](03-functional-requirements.md).
