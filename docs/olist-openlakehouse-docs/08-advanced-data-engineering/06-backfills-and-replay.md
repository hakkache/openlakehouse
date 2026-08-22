# 06 — Backfills and Replay

**Content type: PROJECT IMPLEMENTATION.**

## The scenario

A bug is found in `is_late`'s derivation logic (module 04) — it's been
computing incorrectly for 3 months of data. You fix the transformation,
but now need to **backfill**: reprocess historical data through the
corrected logic, without re-ingesting from source (Bronze is untouched
and still has the real raw data — the entire reason
[`03-bronze-ingestion/04-raw-data-preservation.md`](../03-bronze-ingestion/04-raw-data-preservation.md)'s
"never mutate Bronze" principle exists).

## Hands-On Walkthrough — simulate and recover from exactly this scenario

1. Simulate the bug: rebuild `silver_orders` with a deliberately **wrong**
   `is_late` expression (missing the `NULL`-handling case from
   [`04-silver-transformation/08-business-rules.md`](../04-silver-transformation/08-business-rules.md)):
   `expression = order_delivered_customer_date >
   order_estimated_delivery_date` (no `NULL` guard — SQL's 3-valued logic
   still handles it correctly here, so instead simulate a *real* bug:
   swap the comparison operator, `expression =
   order_delivered_customer_date < order_estimated_delivery_date`, which
   inverts the entire flag).
2. Run it, confirm the bug is real:
   ```sql
   SELECT is_late, count(*) FROM iceberg.silver.olist_orders GROUP BY is_late;
   ```
   **Expected result**: the `true`/`false` proportions are now inverted
   compared to
   [`04-silver-transformation/08-business-rules.md`](../04-silver-transformation/08-business-rules.md)'s
   original correct output — most orders now incorrectly show `is_late =
   true`.
3. **The backfill**: fix the expression back to the correct operator, and
   simply **re-run the same pipeline** (module 04's `silver_orders`).
   **Expected result**: because Bronze was never touched, and Silver's
   write is a full `createOrReplace()`/full-refresh (module 04's design),
   "backfilling" this bug fix is just "re-run the pipeline once" — no
   special backfill machinery needed, because full-refresh pipelines are
   inherently trivially backfillable.
4. Verify the fix: re-run the `GROUP BY is_late` query. **Expected
   result**: back to the correct proportions.

## Where a real backfill gets harder (forward reference, honestly scoped)

The trivial "just re-run it" backfill above only works because this
project's pipelines are full-refresh. An **incremental** pipeline (module
08 doc 01's `MERGE`-based one) backfilling 3 months of history requires
either (a) a one-time full reprocess with the corrected logic (same as
above, just against the incremental table instead), or (b) replaying the
original event stream from a stored offset/checkpoint — genuinely harder,
and the reason
[`14-streaming-and-cdc/06-streaming-production-scenarios.md`](../14-streaming-and-cdc/06-streaming-production-scenarios.md)
treats Kafka replay as its own topic.

> 🧪 **Checkpoint**: you introduced a real logic bug, confirmed its
> visible wrong output, then backfilled it with a single pipeline re-run
> — made possible entirely because Bronze was preserved untouched.

## Next document

[`07-partitioning-and-small-files.md`](07-partitioning-and-small-files.md).
