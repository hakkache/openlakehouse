# 07 — Data Quality Gates

**Content type: CURRENT PLATFORM CAPABILITY + PROJECT IMPLEMENTATION.**

## The 6 real quality node types

Verified from `pipeline_compiler.py`: `not_null`, `unique`, `range`,
`regex`, `row_count`, `freshness`. Each compiles to a `SELECT COUNT(*) AS
violations FROM ... WHERE <bad condition>` query — a violation count of
`0` means the gate passes.

## Hands-On Walkthrough — attach 4 real gates to `silver_orders`

1. Open the `silver_orders` pipeline (built across
   [`02-data-cleaning.md`](02-data-cleaning.md)/[`03-type-casting.md`](03-type-casting.md)).
2. Add a **not_null** quality node after the cast node, `columns =
   order_id, customer_id, order_status`. Compile. **Expected SQL shape**:
   ```sql
   SELECT COUNT(*) AS violations FROM <predecessor>
   WHERE order_id IS NULL OR customer_id IS NULL OR order_status IS NULL
   ```
3. Add a **unique** quality node, `columns = order_id`. **Expected SQL
   shape**:
   ```sql
   SELECT COUNT(*) AS violations FROM
   (SELECT order_id, COUNT(*) AS c FROM <predecessor> GROUP BY order_id) t
   WHERE c > 1
   ```
4. Add a **regex** quality node, `column = order_status`, `pattern =
   ^(delivered|shipped|canceled|unavailable|invoiced|processing|created|approved)$`.
5. Add a **freshness** quality node, `column = order_purchase_timestamp`
   (or `purchase_ts` if renamed), `max_age_minutes = 999999999` (a large
   number here — this dataset is historical, 2016-2018, so any realistic
   small `max_age_minutes` would fail everything; a real streaming-order
   pipeline in [`14-streaming-and-cdc/`](../14-streaming-and-cdc/) uses a
   genuinely small value like `60`).
6. Run the pipeline. On the Pipelines page, open this run's detail view.
   **Expected result**: all 4 quality node rows show `violations = 0` and
   a green/passed status badge (real Olist data is clean at these checks
   — this is not a scripted pass).

## Prove a gate actually catches something (negative test)

7. Temporarily edit the **regex** node's `pattern` to an intentionally
   wrong value, e.g. `^delivered$` (excludes every other valid status).
8. Re-run the pipeline. **Expected result**: the regex quality node now
   shows a large nonzero `violations` count (every non-`delivered` order)
   and the run status reflects the failed gate.
9. Revert the pattern to the correct one from step 4 and re-run to
   confirm it returns to `violations = 0` — leave the pipeline in this
   correct, passing state.

## Where does a "failed" run cost you anything?

**Content type: CURRENT PLATFORM CAPABILITY (verified), noting the
current limitation.** A quality node reports its violation count on the
run detail page, but does **not** currently block the destination write
if placed after it in the graph — check placement carefully: put quality
nodes **before** the destination node in your graph so a human reviewing
the run can catch violations before they'd reach Silver in a stricter,
future gate-blocking implementation. This is a documented current
limitation, not a design goal — see
[`10-data-quality/08-quality-failure-scenarios.md`](../10-data-quality/08-quality-failure-scenarios.md)
for the full negative-testing treatment of what currently does and does
not stop a bad write.

> 🧪 **Checkpoint**: you saw 4 real quality gates pass on real data, then
> deliberately broke one and watched its violation count become nonzero,
> then fixed it back.

## Next document

[`08-business-rules.md`](08-business-rules.md).
