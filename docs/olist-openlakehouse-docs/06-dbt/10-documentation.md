# 10 — Documentation

**Content type: CURRENT PLATFORM CAPABILITY (dbt's own feature) + PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — generate and browse real dbt docs

1. Add `description:` fields to `_olist_staging.yml`'s columns from
   [`07-tests.md`](07-tests.md) (dbt docs are far more useful with real
   descriptions than bare column names):
   ```yaml
       - name: stg_olist_orders
         description: "One row per Olist order, timestamps cast, sourced from Bronze."
         columns:
           - name: order_id
             description: "Primary key. One order per row."
             tests: [not_null, unique]
   ```
2. Generate the docs site:
   ```powershell
   docker compose exec dbt dbt docs generate
   ```
   **Expected result**: real console output, `Building catalog` /
   `Catalog written to target/catalog.json`.
3. Since this container likely isn't exposed as its own served docs port
   in this project's `docker-compose.yml`, retrieve the generated
   artifacts directly instead:
   ```powershell
   docker compose exec dbt cat dbt_project/target/manifest.json | Select-String "stg_olist_orders" | Select-Object -First 3
   ```
   **Expected result**: real JSON fragments referencing your model,
   including the description and column tests you just wrote — confirms
   `dbt docs generate` picked up your real project metadata, not a cached
   or default catalog.

## What the generated lineage graph actually shows (conceptually, since no served UI here)

The `manifest.json` includes a `depends_on` list per model — for
`mart_olist_order_summary`, this would list
`int_olist_orders_with_revenue`, which itself lists
`stg_olist_orders`/`stg_olist_order_items`, which each list the
`source('bronze', ...)` entries from
[`03-sources.md`](03-sources.md). This dependency chain is the same real
lineage graph concept covered platform-wide in
[`11-lineage-and-governance/01-lineage.md`](../11-lineage-and-governance/01-lineage.md)
— dbt's version is scoped to models it manages, while OpenLakehouse's own
lineage feature (that document) covers the whole platform.

> 🧪 **Checkpoint**: `manifest.json` contains your real column
> descriptions and test definitions, generated from your actual project
> files.

## Next document

[`11-production-dbt.md`](11-production-dbt.md).
