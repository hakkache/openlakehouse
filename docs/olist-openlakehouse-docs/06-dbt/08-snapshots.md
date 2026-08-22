# 08 — Snapshots (dbt's Built-in SCD Type 2)

**Content type: PROJECT IMPLEMENTATION.** This project has no
`snapshots/` folder yet — you are building this for real, from scratch.
Full SCD2 theory is covered in
[`07-dimensional-modeling/08-scd-type-2-fundamentals.md`](../07-dimensional-modeling/08-scd-type-2-fundamentals.md);
this document is the mechanical "how to actually run a dbt snapshot"
walkthrough.

## Hands-On Walkthrough — snapshot `olist_sellers` (simulating seller changes)

1. Via `/dbt`'s create-file action, create
   `snapshots/olist_sellers_snapshot.sql`:
   ```sql
   {% snapshot olist_sellers_snapshot %}
   {{
       config(
           target_schema='snapshots',
           unique_key='seller_id',
           strategy='timestamp',
           updated_at='_loaded_at'
       )
   }}
   select *, current_timestamp as _loaded_at
   from {{ source('bronze', 'olist_sellers') }}
   {% endsnapshot %}
   ```
   (this project's real `olist_sellers` table has no natural
   `updated_at` column, so this snapshot manufactures `_loaded_at` at
   snapshot-run time — an honest, explicit choice, not a silent
   assumption; a real production source would instead expose its own
   true update timestamp).
2. Run: `docker compose exec dbt dbt snapshot`.
3. Verify: `SELECT count(*) FROM iceberg.snapshots.olist_sellers_snapshot;`
   **Expected result**: `3095`, each row now with dbt's added
   `dbt_valid_from`/`dbt_valid_to`/`dbt_scd_id` columns,
   `dbt_valid_to IS NULL` for every row (nothing has changed yet — this
   is the first snapshot run, so every row is its own first/only
   version).
4. **Simulate a real change**: update one seller's city via a Pipeline
   Builder pipeline or Jupyter cell writing directly to
   `bronze.olist_sellers` (e.g. change seller `"1f50f920176fa81dab994f9023523100"`'s
   `seller_city`), then re-run `dbt snapshot`.
5. Verify:
   ```sql
   SELECT seller_id, seller_city, dbt_valid_from, dbt_valid_to
   FROM iceberg.snapshots.olist_sellers_snapshot
   WHERE seller_id = '<the seller you changed>'
   ORDER BY dbt_valid_from;
   ```
   **Expected result**: **2 rows** for that one seller — the old city
   value now has a real `dbt_valid_to` timestamp (when the change was
   detected), and a new row has the new city with `dbt_valid_to IS NULL`
   — this is real, working SCD Type 2 history, produced by dbt's built-in
   snapshot mechanism.

> 🧪 **Checkpoint**: you changed one real row's value, re-ran `dbt
> snapshot`, and found exactly 2 historical versions of that row with
> correct `dbt_valid_from`/`dbt_valid_to` boundaries.

## Next document

[`09-incremental-models.md`](09-incremental-models.md).
