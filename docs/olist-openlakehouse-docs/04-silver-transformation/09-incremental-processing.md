# 09 — Incremental Processing (Introduced, Not Yet Solved Here)

**Content type: CURRENT PLATFORM CAPABILITY (limitation) + PROPOSED EXTENSION.**

## The current reality

Every Silver pipeline built so far (`silver_orders`, `silver_customers`,
`silver_order_items`, `silver_reviews`, `silver_sellers`) reads its entire
Bronze source table and writes its entire Silver destination table on
every run — there's no notion of "only the new/changed rows since last
run" built into the Pipeline Builder's compiled SQL (every destination
write is a full `SELECT * FROM ...` over the whole source).

This is completely fine for this project's Olist dataset: it's a static,
one-time historical extract, not a continuously-arriving stream, so "full
refresh every run" is both correct and cheap enough (99,441 orders is not
a lot of data for Trino to fully rescan).

## Hands-On Walkthrough — observe full-refresh behavior directly

1. Re-run the `silver_orders` pipeline a second time, unchanged.
2. In **SQL Editor**:
   ```sql
   SELECT count(*) FROM iceberg.silver.olist_orders;
   ```
   **Expected result**: `99441` — identical to before, confirming the
   destination write is idempotent under full refresh (same underlying
   mechanism as Bronze's `createOrReplace()` idempotency from
   [`03-bronze-ingestion/06-idempotency.md`](../03-bronze-ingestion/06-idempotency.md)).
3. Check the Iceberg snapshot history to see the re-run recorded as a new
   snapshot even though the data is identical:
   ```sql
   SELECT count(*) FROM iceberg.silver."olist_orders$snapshots";
   ```
   **Expected result**: at least 2 — proving Trino did real work (a full
   rewrite) on the second run, it didn't detect "nothing changed" and skip.
   This is the cost of full-refresh-only processing: correctness at the
   price of always doing full work.

## Where real incremental processing is covered

**PROPOSED EXTENSION** (not implemented in the Pipeline Builder today):
true incremental Silver processing — reading only new Bronze rows since
the last successful run and `MERGE INTO`-ing them — is covered as a
hands-on pattern you build yourself with raw SQL/PySpark (not the
Pipeline Builder UI) in
[`08-advanced-data-engineering/01-incremental-processing.md`](../08-advanced-data-engineering/01-incremental-processing.md),
which also covers the exact `MERGE INTO` multi-event-per-key bug this
project's own build process hit for real (documented there in full).

> 🧪 **Checkpoint**: you've confirmed, with two real snapshot IDs, that
> this platform's current Pipeline Builder always does a full-table
> rewrite — an important operational fact to know before scaling this
> approach to a much larger source table.

## Next document

[`10-silver-testing.md`](10-silver-testing.md).
