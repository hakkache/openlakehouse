# 10 — SCD2 via dbt Snapshot (Comparison)

**Content type: PROJECT IMPLEMENTATION.** Compares the manual `MERGE`
approach ([`09-scd2-manual-merge.md`](09-scd2-manual-merge.md)) against
dbt's built-in `snapshot` mechanism (already used once in
[`06-dbt/08-snapshots.md`](../06-dbt/08-snapshots.md)).

## Column-naming differences (the same concept, different labels)

| Manual MERGE (doc 09) | dbt snapshot (built-in) |
|---|---|
| `valid_from` | `dbt_valid_from` |
| `valid_to` | `dbt_valid_to` |
| `is_current` (you add this yourself) | derive as `dbt_valid_to IS NULL` — dbt doesn't generate an `is_current` column itself |
| `seller_key` (you generate) | `dbt_scd_id` (dbt generates this) |

## Hands-On Walkthrough — add the missing `is_current` convenience column on top of dbt's snapshot

1. You already have `olist_sellers_snapshot` from
   [`06-dbt/08-snapshots.md`](../06-dbt/08-snapshots.md). Create
   `models/marts/dim_sellers_scd2_dbt.sql`:
   ```sql
   select
       dbt_scd_id as seller_key,
       seller_id,
       seller_city,
       seller_state,
       dbt_valid_from as valid_from,
       dbt_valid_to as valid_to,
       dbt_valid_to is null as is_current
   from {{ ref('olist_sellers_snapshot') }}
   ```
   (note: referencing a snapshot via `ref()` works exactly like
   referencing a model — this is one of dbt's real conveniences).
2. Run: `docker compose exec dbt dbt run --select dim_sellers_scd2_dbt`.
3. Verify the exact same seller you changed in doc 09 (if you also ran
   the snapshot's own change-detection re-run from
   [`06-dbt/08-snapshots.md`](../06-dbt/08-snapshots.md) on this seller):
   ```sql
   SELECT * FROM iceberg.<schema>.dim_sellers_scd2_dbt
   WHERE seller_id = '<changed seller_id>' ORDER BY valid_from;
   ```
   **Expected result**: 2 rows, same shape as doc 09's manual version —
   confirms both approaches produce equivalent SCD2 history, dbt's
   snapshot just automates the MERGE mechanics doc 09 wrote by hand.

## When to use which, in this project

- **dbt snapshot**: default choice — less code, battle-tested, integrates
  with `dbt build`/tests/docs (module 06).
- **Manual MERGE**: needed when the change-detection logic is too
  complex for dbt's `timestamp`/`check` snapshot strategies (e.g.
  multi-column conditional logic, or merging in from a non-dbt-managed
  streaming source — see
  [`14-streaming-and-cdc/05-ordering-dedup-and-merge.md`](../14-streaming-and-cdc/05-ordering-dedup-and-merge.md)).

> 🧪 **Checkpoint**: both the manual-MERGE and dbt-snapshot versions of
> `dim_sellers` SCD2 agree on the same seller's 2-version history.

## Next document

[`11-scd2-testing.md`](11-scd2-testing.md).
