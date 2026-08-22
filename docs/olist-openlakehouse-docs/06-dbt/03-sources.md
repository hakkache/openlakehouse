# 03 — Sources

**Content type: PROJECT IMPLEMENTATION.**

## Why `source()` instead of hardcoding `iceberg.bronze.olist_orders`

Using `{{ source('bronze', 'olist_orders') }}` (resolved from the
`_olist_sources.yml` file from
[`02-project-structure.md`](02-project-structure.md)) instead of a
hardcoded schema/table string means: if Bronze's location ever moves
(e.g. a future re-platforming), you update one YAML file, not every
model that reads from it. It also lets dbt draw a real lineage arrow
from Bronze into your staging models — visible in
[`10-documentation.md`](10-documentation.md)'s generated docs.

## Hands-On Walkthrough — a source freshness check (real, using dbt's own feature)

1. Add a `freshness` block to the `olist_orders` source entry in
   `_olist_sources.yml`:
   ```yaml
       tables:
         - name: olist_orders
           loaded_at_field: order_purchase_timestamp
           freshness:
             warn_after: {count: 100000, period: day}
             error_after: {count: 200000, period: day}
   ```
   (deliberately huge thresholds — this is 2016-2018 historical data, so
   a realistic small threshold would always fail; see
   [`04-silver-transformation/07-data-quality-gates.md`](../04-silver-transformation/07-data-quality-gates.md)'s
   identical callout about `freshness` quality nodes for the same reason).
2. Run:
   ```powershell
   docker compose exec dbt dbt source freshness
   ```
3. **Expected result**: real console output reporting `PASS` for
   `bronze.olist_orders`'s freshness check — genuine dbt CLI execution
   against your real Bronze table's max timestamp, not a simulated
   result.

> 🧪 **Checkpoint**: `dbt source freshness` ran for real and reported a
> real `PASS`, based on the actual max `order_purchase_timestamp` in your
> Bronze table.

## Next document

[`04-staging-models.md`](04-staging-models.md).
