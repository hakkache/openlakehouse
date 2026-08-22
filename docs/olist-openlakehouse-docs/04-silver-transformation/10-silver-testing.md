# 10 — Silver Testing

**Content type: PROJECT IMPLEMENTATION.**

## The Silver verification checklist

Run this after building every Silver pipeline in this module, exactly like
[`03-bronze-ingestion/08-bronze-testing.md`](../03-bronze-ingestion/08-bronze-testing.md)'s
Bronze checklist, but now checking types and quality gates too.

## Hands-On Walkthrough

1. **Row counts match Bronze** (no accidental row loss/gain from any
   transform):
   ```sql
   SELECT 'orders' t, (SELECT count(*) FROM iceberg.bronze.olist_orders) b,
          (SELECT count(*) FROM iceberg.silver.olist_orders) s
   UNION ALL
   SELECT 'customers', (SELECT count(*) FROM iceberg.bronze.olist_customers),
          (SELECT count(*) FROM iceberg.silver.olist_customers)
   UNION ALL
   SELECT 'order_items', (SELECT count(*) FROM iceberg.bronze.olist_order_items),
          (SELECT count(*) FROM iceberg.silver.olist_order_items)
   UNION ALL
   SELECT 'reviews', (SELECT count(*) FROM iceberg.bronze.olist_reviews),
          (SELECT count(*) FROM iceberg.silver.olist_reviews);
   ```
   **Expected result**: `b` equals `s` on every row (`99441`/`99441`,
   `99441`/`99441`, `112650`/`112650`, `104162`/`104162`).
2. **Types are correct** (spot-check the two fixes made in this module):
   ```sql
   SELECT typeof(customer_zip_code_prefix) FROM iceberg.silver.olist_customers LIMIT 1;
   SELECT typeof(price) FROM iceberg.silver.olist_order_items LIMIT 1;
   ```
   **Expected**: `varchar`, `decimal(10,2)`.
3. **No nulls in the enforced-not-null columns**:
   ```sql
   SELECT count(*) FROM iceberg.silver.olist_orders
   WHERE order_id IS NULL OR customer_id IS NULL OR order_status IS NULL;
   ```
   **Expected**: `0`.
4. **`is_late` distribution is sane** (re-run the query from
   [`08-business-rules.md`](08-business-rules.md) step 4) — confirms the
   business rule survived any later re-runs/edits to the pipeline.
5. **Idempotency**: re-run every Silver pipeline once more and re-run
   query 1 above. **Expected**: identical numbers — no drift from a
   second run.

## Closing this module out

You now have 5 real Silver tables (`olist_orders`, `olist_customers`,
`olist_order_items`, `olist_reviews`, and you should replicate the same
pattern yourself for `olist_products`, `olist_sellers`,
`olist_payments`, `olist_geolocation`, `category_translation` before
moving on — the star schema in
[`02-source-and-data-model/07-star-schema.md`](../02-source-and-data-model/07-star-schema.md)
needs all 9 as Silver inputs to build Gold).

> 🧪 **Checkpoint for the whole module**: all 9 Bronze tables have a
> corresponding Silver table with matching row counts, corrected types,
> zero not-null violations, and a working `is_late` derivation.

## Next module

[`05-pipeline-builder/01-fundamentals.md`](../05-pipeline-builder/01-fundamentals.md)
— now that you've used several Pipeline Builder node types hands-on,
this module goes deep on the full node catalog, control flow, and 14
real end-to-end pipeline scenarios.
