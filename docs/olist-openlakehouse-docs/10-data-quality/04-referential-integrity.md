# 04 — Referential Integrity

**Content type: PROJECT IMPLEMENTATION.**

## Why this needs its own check (Iceberg has no foreign key enforcement)

Iceberg tables have no native `FOREIGN KEY` constraint — nothing stops a
`fact_orders` row from having a `customer_key` that doesn't exist in
`dim_customers`. This must be checked explicitly.

## Hands-On Walkthrough — the real orphan-check query, run against every fact/dimension pair

1. Check `fact_orders` against `dim_customers`:
   ```sql
   SELECT count(*) AS orphans
   FROM iceberg.gold.fact_orders f
   LEFT JOIN iceberg.gold.dim_customers d ON f.customer_key = d.customer_key
   WHERE d.customer_key IS NULL;
   ```
   **Expected result**: `0` — every fact row's customer key genuinely
   resolves.
2. Repeat for `fact_orders` against both `dim_date` joins
   (`purchase_date_key`, `delivery_date_key` — remember
   `delivery_date_key` can legitimately be `NULL` for undelivered orders,
   per
   [`04-silver-transformation/08-business-rules.md`](../04-silver-transformation/08-business-rules.md)
   — exclude `NULL` deliveries from this specific check):
   ```sql
   SELECT count(*) AS orphans
   FROM iceberg.gold.fact_orders f
   LEFT JOIN iceberg.gold.dim_date d ON f.delivery_date_key = d.date_key
   WHERE f.delivery_date_key IS NOT NULL AND d.date_key IS NULL;
   ```
3. Repeat for `fact_order_items` against `dim_products`/`dim_sellers`.
4. **Negative test**: temporarily delete one real row from `dim_customers`
   that a fact row depends on:
   ```python
   spark.sql("DELETE FROM catalog.gold.dim_customers WHERE customer_key = (SELECT min(customer_key) FROM catalog.gold.dim_customers)")
   ```
   Re-run step 1's query. **Expected result**: `orphans >= 1` — a real,
   detected referential-integrity break. This is exactly the kind of
   silent corruption a fact table can develop if a dimension rebuild
   process ever drops rows unexpectedly.
5. Rebuild `dim_customers` from
   [`07-dimensional-modeling/04-customer-dimension.md`](../07-dimensional-modeling/04-customer-dimension.md)
   to restore the deleted row, then re-confirm `orphans = 0`.

> 🧪 **Checkpoint**: you deleted a real dimension row, watched a real
> orphan count appear in your fact table check, then repaired it and
> confirmed the check returns to `0`.

## Next document

[`05-freshness.md`](05-freshness.md).
