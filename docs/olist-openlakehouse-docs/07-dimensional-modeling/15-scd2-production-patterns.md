# 15 — SCD2 Production Patterns

**Content type: PROJECT IMPLEMENTATION.** Closes out the module with the
operational patterns you'd actually run in production, not just in a
one-off notebook.

## Pattern 1 — surrogate key stability across runs

[`08-scd-type-2-fundamentals.md`](08-scd-type-2-fundamentals.md) noted
`monotonically_increasing_id()`'s keys aren't small sequential integers.
The real production concern: **never regenerate surrogate keys for
existing rows on a re-run** — only ever `INSERT` new rows with new keys,
never `createOrReplace()` a Type-2 dimension wholesale (that would
silently reassign every existing row's surrogate key, breaking every fact
table's stored foreign key). Verify this yourself:
```sql
SELECT seller_key FROM iceberg.gold.dim_sellers_scd2_dbt WHERE seller_id = '<a seller>' AND is_current = false;
```
Re-run this after any future `dbt snapshot` run — the key must be
unchanged. This is why every walkthrough in this module used `MERGE`/
`INSERT`, never `createOrReplace()`, on SCD2 tables.

## Pattern 2 — orchestrate the expire+insert as one atomic unit

Wire [`09-scd2-manual-merge.md`](09-scd2-manual-merge.md)'s Step A and
Step B into a single Dagster op (module 09) so a failure between them
can't leave the table in a half-expired state (a row with `is_current =
false` but no new row yet inserted) — covered concretely in
[`09-orchestration/04-retries-and-failure-recovery.md`](../09-orchestration/04-retries-and-failure-recovery.md).

## Pattern 3 — always dedupe incoming batches (recap of Scenario A)

Standing rule from [`12-scd2-failure-scenarios.md`](12-scd2-failure-scenarios.md):
every batch feeding an SCD2 merge gets a
`ROW_NUMBER() OVER (PARTITION BY <natural_key> ORDER BY <event_time> DESC)`
dedupe step immediately before the `MERGE`, with no exceptions — even
when you're confident the source "shouldn't" send duplicates.

## Pattern 4 — test the 3 invariants on every scheduled run, not just once

[`11-scd2-testing.md`](11-scd2-testing.md)'s 3 dbt tests should run as
part of the same scheduled `dbt build` (module 06/09), so a regression is
caught the same day it's introduced, not discovered months later during
an audit.

## Hands-On Walkthrough — the full production run, end to end

1. Chain, in one Dagster job (forward reference — build this for real in
   [`09-orchestration/03-scheduling.md`](../09-orchestration/03-scheduling.md)):
   dedupe staged changes → expire old versions → insert new versions →
   run the 3 SCD2 invariant tests → alert if any fail.
2. Confirm you can articulate, from memory, all 4 patterns above and the
   real bug/scenario each one directly prevents (patterns 1-4 map 1:1 to
   documents 08/09, 09, 12, and 11 respectively in this module).

> 🧪 **Checkpoint for the whole module**: you have a fully working,
> tested, production-pattern-aware SCD2 implementation for
> `dim_sellers`, plus 4 conformed dimensions and 2 fact tables completing
> this project's real star schema.

## Next module

[`08-advanced-data-engineering/01-incremental-processing.md`](../08-advanced-data-engineering/01-incremental-processing.md).
