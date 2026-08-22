# 02 — Dimension Design

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — build the surrogate-key generation pattern once, reuse for every dimension

1. Create pipeline `dim_sellers_build` (or a dbt model — this walkthrough
   uses the Pipeline Builder; module 06 already showed the dbt-equivalent
   patterns).
2. Source: `schema = silver`, `table = olist_sellers`.
3. Add a **derived_column** node: `name = seller_key`,
   `expression = row_number() over (order by seller_id)` — a simple,
   deterministic surrogate key generator (monotonic increasing integer,
   stable as long as the underlying `seller_id` ordering doesn't change
   between runs — a real limitation, addressed in
   [`15-scd2-production-patterns.md`](15-scd2-production-patterns.md)).
4. Add a **select** node reordering/renaming to the final dimension shape:
   `seller_key, seller_id, seller_city, seller_state,
   seller_zip_code_prefix`.
5. Destination: `iceberg_gold` / `dim_sellers`, run.
6. Verify:
   ```sql
   SELECT count(*) AS n, count(DISTINCT seller_key) AS distinct_keys
   FROM iceberg.gold.dim_sellers;
   ```
   **Expected result**: both `3095` — confirms `seller_key` really is
   unique per row, a hard requirement for it to work as a join key.

## Conformed dimensions (recap, now made concrete)

`dim_sellers` and `dim_customers` (built next in
[`04-customer-dimension.md`](04-customer-dimension.md)) both use
`seller_state`/`customer_state` with the exact same 2-letter Brazilian
state code values — this is what makes them **conformed**: any BI tool
(module 12) can filter both dimensions by the same `state` value and get
consistent results, without a translation table.

> 🧪 **Checkpoint**: `dim_sellers` has exactly `3095` rows, each with a
> unique `seller_key`, confirmed by a single query comparing total count
> to distinct-key count.

## Next document

[`03-date-dimension.md`](03-date-dimension.md).
