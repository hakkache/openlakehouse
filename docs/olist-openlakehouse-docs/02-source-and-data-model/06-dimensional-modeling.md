# 06 — Dimensional Modeling (Introduction)

**Content type: PROJECT IMPLEMENTATION.** This is a short bridge document;
the full, deep dimensional-modeling module (fundamentals through the
complete SCD2 engineering treatment) lives in `07-dimensional-modeling/`.

## Purpose

Give the minimum dimensional-modeling vocabulary needed to read
`07-star-schema.md` and `08-business-metrics.md`, without duplicating the
full depth of `07-dimensional-modeling/`.

## Core vocabulary

- **Dimension**: descriptive context ("who/what/where/when") — e.g.
  `dim_customers`, `dim_products`, `dim_date`.
- **Fact**: a measured business event — e.g. `fact_orders`,
  `fact_order_items` — containing foreign keys to dimensions plus numeric
  measures (`price`, `freight_value`, `payment_value`).
- **Surrogate key**: a platform-generated integer/hash key for a dimension
  row, independent of the natural (business) key — required for SCD2,
  since a natural key alone (e.g. `customer_unique_id`) can map to
  multiple dimension rows (one per historical version).
- **Conformed dimension**: a dimension shared/reused across multiple fact
  tables with identical meaning — e.g. `dim_date` used by both
  `fact_orders` and `fact_order_items`.
- **Additive measure**: safely `SUM()`-able across any dimension (e.g.
  `price`, `freight_value`). **Semi-additive**/**non-additive** measures
  (e.g. a `review_score` average) require care — see
  `08-business-metrics.md`.

## Where this leads next

- The full conceptual foundation (star vs. snowflake, fact types, SCD
  types 0-2 overview) is in
  `07-dimensional-modeling/01-dimensional-modeling-fundamentals.md`.
- The complete SCD Type 2 engineering module (source identification
  through production patterns, 15 documents) is the rest of
  `07-dimensional-modeling/`.
- This document's job is only to unblock `07-star-schema.md` and
  `08-business-metrics.md`, which stay in this module because they're
  specific to *this dataset's* schema, not general dimensional-modeling
  theory.

## Next document

[`07-star-schema.md`](07-star-schema.md).
