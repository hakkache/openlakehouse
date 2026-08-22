# 02 — Project Structure

**Content type: PROJECT IMPLEMENTATION.**

## The layer folders and their real materialization

**Verified from `dbt_project.yml`**: `staging/`, `intermediate/`, and
`marts/` are each configured `+materialized: table` (not `view`) — every
model in this project builds as a real Iceberg table on every `dbt run`,
matching the "full refresh, correctness over incrementality" approach
already established for this dataset in
[`04-silver-transformation/09-incremental-processing.md`](../04-silver-transformation/09-incremental-processing.md).

## Hands-On Walkthrough — create the Olist staging folder structure

1. Open `http://localhost/dbt`.
2. Use the UI's **Create file** action (or the equivalent
   `create_file`-backed button) to create
   `models/staging/_olist_sources.yml`:
   ```yaml
   version: 2
   sources:
     - name: bronze
       schema: bronze
       tables:
         - name: olist_orders
         - name: olist_customers
         - name: olist_order_items
         - name: olist_payments
         - name: olist_reviews
         - name: olist_products
         - name: olist_sellers
         - name: olist_geolocation
         - name: category_translation
   ```
3. Back in a terminal, confirm the file landed on disk for real:
   ```powershell
   docker compose exec dbt cat dbt_project/models/staging/_olist_sources.yml
   ```
   **Expected result**: the exact YAML you pasted in the UI — proves the
   `/dbt` page's "create file" button writes real files, not just a UI-
   local draft.

## Why `sources:` matters (forward reference)

This file is what makes `{{ source('bronze', 'olist_orders') }}` resolve
to `iceberg.bronze.olist_orders` in every staging model you write next —
covered in [`03-sources.md`](03-sources.md).

> 🧪 **Checkpoint**: `models/staging/_olist_sources.yml` exists on disk
> inside the dbt container, confirmed via both the UI and a direct
> terminal read.

## Next document

[`03-sources.md`](03-sources.md).
