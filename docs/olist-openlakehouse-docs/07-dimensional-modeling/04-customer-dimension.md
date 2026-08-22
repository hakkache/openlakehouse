# 04 — Customer Dimension

**Content type: PROJECT IMPLEMENTATION.**

## The real modeling decision: grain at `customer_unique_id`, not `customer_id`

Per [`01-dimensional-modeling-fundamentals.md`](01-dimensional-modeling-fundamentals.md),
`dim_customers` must be built at the `customer_unique_id` grain — a
repeat customer's multiple `customer_id` rows collapse to one dimension
row.

## Hands-On Walkthrough

1. Create pipeline `dim_customers_build`. Source: `schema = silver`,
   `table = olist_customers`.
2. Add an **aggregate** node: `group_by = customer_unique_id`,
   `aggregations = {"customer_city": "max", "customer_state": "max",
   "customer_zip_code_prefix": "max"}` (using `max` as an arbitrary
   deterministic tiebreaker across a repeat customer's rows — Olist's
   real data has these fields consistent per unique customer in
   practice, verify this assumption in step 4).
3. Add a **derived_column** node: `name = customer_key`,
   `expression = row_number() over (order by customer_unique_id)`.
4. **Before finalizing** — verify the tiebreaker assumption from step 2 is
   safe:
   ```sql
   SELECT customer_unique_id, count(DISTINCT customer_city) AS distinct_cities
   FROM iceberg.silver.olist_customers
   GROUP BY customer_unique_id
   HAVING count(DISTINCT customer_city) > 1
   LIMIT 5;
   ```
   **Expected result**: likely `0` rows (a real repeat customer's city
   doesn't usually vary across their orders in this dataset) — if you do
   find rows here, that's a genuine SCD Type 2 signal (a customer who
   moved), covered properly starting in
   [`08-scd-type-2-fundamentals.md`](08-scd-type-2-fundamentals.md) rather
   than papered over by `max()`.
5. Add destination `iceberg_gold` / `dim_customers`, run, verify:
   ```sql
   SELECT count(*) FROM iceberg.gold.dim_customers;
   ```
   **Expected result**: `96096` — the exact distinct `customer_unique_id`
   count from
   [`02-source-and-data-model/04-source-relationships.md`](../02-source-and-data-model/04-source-relationships.md),
   confirming the grain is correct.

> 🧪 **Checkpoint**: `dim_customers` has exactly `96096` rows (not
> `99441`), and you've verified with a real query that collapsing repeat
> customers via `max()` didn't silently hide a genuine city change.

## Next document

[`05-product-dimension.md`](05-product-dimension.md).
