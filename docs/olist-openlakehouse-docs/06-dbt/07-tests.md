# 07 — Tests

**Content type: PROJECT IMPLEMENTATION.** This repo already has 15
passing dbt schema tests (per repo history) — this document adds Olist-
specific ones following that established pattern.

## Hands-On Walkthrough — generic + custom tests on `stg_olist_orders`

1. Create `models/staging/_olist_staging.yml`:
   ```yaml
   version: 2
   models:
     - name: stg_olist_orders
       columns:
         - name: order_id
           tests: [not_null, unique]
         - name: order_status
           tests:
             - accepted_values:
                 values: ['delivered','shipped','canceled','unavailable',
                          'invoiced','processing','created','approved']
     - name: int_olist_orders_with_revenue
       columns:
         - name: total_order_value
           tests:
             - dbt_utils.accepted_range:
                 min_value: 0
                 inclusive: true
   ```
   (the `dbt_utils.accepted_range` test requires the `dbt_utils` package —
   if not already installed, add it to `packages.yml` and run
   `dbt deps` first; if unavailable, substitute a plain custom SQL test
   as in step 3 below instead).
2. Run: `docker compose exec dbt dbt test --select stg_olist_orders int_olist_orders_with_revenue`.
   **Expected result**: real pass output for all 3 generic tests
   (`not_null`, `unique`, `accepted_values`) — genuine SQL executed
   against your real staging table, each returning `0` failing rows.
3. Add a **custom singular test**,
   `tests/assert_no_negative_freight.sql`:
   ```sql
   select * from {{ ref('int_olist_orders_with_revenue') }}
   where total_freight < 0
   ```
   (a singular test "passes" when this query returns **zero rows** — the
   opposite convention from a normal SELECT, this is dbt's own test
   contract).
4. Run: `docker compose exec dbt dbt test --select assert_no_negative_freight`.
   **Expected result**: `PASS` — `0` rows returned, confirming no
   negative freight values exist in the real dataset.

## Negative test — watch a test actually fail

5. Temporarily edit the `accepted_values` list in step 1 to remove
   `'delivered'` from it, re-run `dbt test --select stg_olist_orders`.
   **Expected result**: a real `FAIL`, with dbt reporting the exact
   number of rows with `order_status = 'delivered'` as failures (the
   majority of the table) — proof the test genuinely inspects your data.
   Revert the list afterward.

> 🧪 **Checkpoint**: 4 real dbt tests pass on real data, and you watched
> one intentionally-broken test report a real, large failure count.

## Next document

[`08-snapshots.md`](08-snapshots.md).
