# Module 08 — Dimensional Modeling and SCD2

**Content type: PROJECT WORK.** The star schema, built and tested step by
step, including the most important reproducible bug in this whole guide.

## Document map

| # | Document | Covers |
|---|---|---|
| 01 | [`01-star-schema-design.md`](01-star-schema-design.md) | Target ERD, grain decisions |
| 02 | [`02-building-dimensions.md`](02-building-dimensions.md) | `dim_sellers`, `dim_date`, `dim_customers` at the correct grain |
| 03 | [`03-building-facts.md`](03-building-facts.md) | `fact_order_items`, `fact_orders`, role-playing dimensions |
| 04 | [`04-scd1-vs-scd2.md`](04-scd1-vs-scd2.md) | Type 1 vs Type 2, built and compared directly |
| 05 | [`05-the-merge-multi-event-bug.md`](05-the-merge-multi-event-bug.md) | Reproducing and fixing the real MERGE INTO bug |
| 06 | [`06-temporal-joins.md`](06-temporal-joins.md) | Current-only vs. temporally-correct joins |

## Next document

[`01-star-schema-design.md`](01-star-schema-design.md).
