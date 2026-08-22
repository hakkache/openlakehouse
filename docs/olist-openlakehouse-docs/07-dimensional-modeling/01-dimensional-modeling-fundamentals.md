# 01 — Dimensional Modeling Fundamentals

**Content type: PROJECT IMPLEMENTATION.** Builds directly on the
vocabulary already introduced in
[`02-source-and-data-model/06-dimensional-modeling.md`](../02-source-and-data-model/06-dimensional-modeling.md).
This module is where you actually build every dimension and fact table
for real, plus a full production-grade treatment of SCD Type 2.

## Recap of the target star schema

From [`02-source-and-data-model/07-star-schema.md`](../02-source-and-data-model/07-star-schema.md):
`dim_customers`, `dim_products`, `dim_sellers`, `dim_date`, `fact_orders`,
`fact_order_items` — all built as real `iceberg_gold` tables, primarily
via the Pipeline Builder (module 05) and/or dbt marts (module 06); use
whichever tool you prefer per table, this module shows both.

## The one rule every dimension in this module follows

Every dimension has a **surrogate key** (a meaningless, generated integer
or UUID, e.g. `customer_key`) separate from its **natural/business key**
(`customer_unique_id`) — never join fact tables to dimensions on the
natural key directly once SCD Type 2 is introduced (documents 08-15),
because a natural key can map to *multiple* historical dimension rows.

## Hands-On Walkthrough — see why natural keys break under history, before you build any SCD2 logic

1. In **SQL Editor**, run:
   ```sql
   SELECT customer_unique_id, count(*) AS n
   FROM iceberg.silver.olist_customers
   GROUP BY customer_unique_id
   HAVING count(*) > 1
   ORDER BY n DESC LIMIT 5;
   ```
   **Expected result**: real rows — this is the same 3,345-repeat-customer
   fact from
   [`02-source-and-data-model/04-source-relationships.md`](../02-source-and-data-model/04-source-relationships.md),
   now viewed as the concrete reason a natural key alone can't be a
   dimension's join key even *before* SCD2 — a single `customer_unique_id`
   already has multiple `customer_id` rows in the raw source, and SCD2
   (module 08+) will add a *second*, independent reason: multiple *time-
   versioned* rows per key too.

> 🧪 **Checkpoint**: you can state, using this query's real output, why a
> generated surrogate key (not `customer_unique_id`, and not
> `customer_id`) must be `dim_customers`'s join key for `fact_orders`.

## Next document

[`02-dimension-design.md`](02-dimension-design.md).
