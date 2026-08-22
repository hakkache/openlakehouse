# 03 — Marts, Tests, and Freshness

## Scenario 3 (Medium→Complex) — marts, tests, and freshness

1. Build `mart_olist_order_summary.sql` (monthly revenue), add real
   generic tests in a schema YAML (`not_null`, `unique`,
   `accepted_values` on `order_status`), plus `dbt_utils.accepted_range`
   on price, and a **custom singular test**
   `assert_no_negative_freight.sql`:
   ```sql
   SELECT * FROM {{ ref('int_olist_orders_with_revenue') }}
   WHERE total_freight < 0
   ```
   (a singular test "passes" when it returns **zero rows**).

## Test-type comparison table

| Test type | Example | Fails when |
|---|---|---|
| Generic `not_null` | on `order_id` | any row has a `NULL` |
| Generic `unique` | on `order_id` | any duplicate key |
| Generic `accepted_values` | `order_status` in a fixed list | any unexpected value |
| Generic `dbt_utils.accepted_range` | `total_price >= 0` | any out-of-range value |
| Singular (custom SQL) | `assert_no_negative_freight.sql` | the query returns any row |

2. ```powershell
   docker compose exec dbt dbt build --select +mart_olist_order_summary --project-dir dbt_project --profiles-dir profiles
   ```
   — builds the full dependency chain and runs its tests in one command.
   **Expected result**: all green.
3. Add a `freshness` block to the sources YAML, run
   `dbt source freshness` — expect a pass with generous thresholds (this
   is historical, not live, data).

> 🧪 **Checkpoint**: `dbt build` passes end-to-end including your custom
> singular test, and `dbt source freshness` reports a real pass.

## Next document

[`04-snapshots-scd2.md`](04-snapshots-scd2.md).
