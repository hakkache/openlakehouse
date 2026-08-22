# 03 — Metadata and Catalog

**Content type: CURRENT PLATFORM CAPABILITY (verified) + PROJECT IMPLEMENTATION.**

## The 3 real, distinct metadata surfaces in this project

1. **Iceberg's own metadata tables** (`$snapshots`, `$files`,
   `$partitions`, `$history`) — used extensively already in modules 07-08.
2. **Polaris REST catalog** — the actual Iceberg catalog server tracking
   table locations/schemas; verify it directly.
3. **dbt's `manifest.json`** — model descriptions/tests/dependencies, per
   [`06-dbt/10-documentation.md`](../06-dbt/10-documentation.md).

## Hands-On Walkthrough — query the real Polaris catalog directly

1. From a terminal:
   ```powershell
   docker compose exec trino trino --execute "SHOW TABLES FROM iceberg.gold"
   ```
   **Expected result**: real table list — `dim_customers`, `dim_date`,
   `dim_products`, `dim_sellers`, `fact_orders`, `fact_order_items`, plus
   any quality/scratch tables you built along the way.
2. Query Polaris's REST API directly for a namespace listing (per
   [`infra/polaris/bootstrap.sh`](../../infra/polaris/bootstrap.sh)'s
   real bootstrap setup):
   ```powershell
   docker compose exec trino curl -s http://polaris:8181/api/catalog/v1/config
   ```
   **Expected result**: real JSON catalog config — confirms Polaris
   itself (not just Trino's view of it) is answering.
3. Cross-reference `iceberg.information_schema.tables` (Trino's own
   metadata view, already used throughout this repo) against Polaris's
   real answer from step 2 — they should list the same tables, since
   Trino's Iceberg connector delegates catalog operations to Polaris.

## Building a real, unified data catalog view

4. Combine table-level metadata with dbt's descriptions into one query-
   able reference table:
   ```sql
   SELECT table_schema, table_name, count(*) AS column_count
   FROM iceberg.information_schema.columns
   WHERE table_schema IN ('bronze','silver','gold')
   GROUP BY table_schema, table_name
   ORDER BY table_schema, table_name;
   ```
   **Expected result**: a real, complete inventory of every table across
   all 3 layers — the practical "data catalog" for this project today
   (no dedicated catalog UI exists yet beyond the Lineage page and this
   kind of direct query — a documented gap, matching
   [`infra/openmetadata/`](../../infra/openmetadata/)'s presence in the
   repo as an available-but-not-required extension for a fuller catalog
   UI).

> 🧪 **Checkpoint**: you confirmed Polaris and Trino agree on the real
> table inventory, and built one unified query listing every table across
> all 3 medallion layers.

## Next document

[`04-impact-analysis.md`](04-impact-analysis.md).
