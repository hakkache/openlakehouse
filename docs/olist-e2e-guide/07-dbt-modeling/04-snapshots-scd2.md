# 04 — Snapshots (Real SCD2 via dbt)

## Scenario 4 (Complex) — snapshots

1. Create `snapshots/olist_sellers_snapshot.sql`:
   ```sql
   {% snapshot olist_sellers_snapshot %}
   {{ config(target_schema='snapshots', unique_key='seller_id', strategy='timestamp', updated_at='_loaded_at') }}
   SELECT *, current_timestamp AS _loaded_at FROM {{ source('silver', 'olist_sellers') }}
   {% endsnapshot %}
   ```
2. `dbt snapshot`. Change one real seller's city in Silver, re-run
   `dbt snapshot`. **Expected result**: 2 historical rows for that
   seller, `dbt_valid_from`/`dbt_valid_to` correctly set.

## Before/after table

| State | `dbt_valid_from` | `dbt_valid_to` | Is current? |
|---|---|---|---|
| Original city | first snapshot run time | 2nd snapshot run time | No |
| Updated city | 2nd snapshot run time | `NULL` | Yes |

3. Query the real history:
   ```sql
   SELECT seller_id, seller_city, dbt_valid_from, dbt_valid_to
   FROM snapshots.olist_sellers_snapshot
   WHERE seller_id = '<your changed seller>'
   ORDER BY dbt_valid_from;
   ```
   **Expected result**: exactly 2 rows, matching the table above.

> 🧪 **Checkpoint**: a real seller change produced exactly 2 historical
> snapshot rows with correct `dbt_valid_from`/`dbt_valid_to` boundaries.

## Next document

[`05-incremental-models.md`](05-incremental-models.md).
