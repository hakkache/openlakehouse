# 08 — Quality Failure Scenarios (Negative Testing)

**Content type: PROJECT IMPLEMENTATION.** Closes the module by addressing
the gap flagged in
[`04-silver-transformation/07-data-quality-gates.md`](../04-silver-transformation/07-data-quality-gates.md):
Pipeline Builder quality nodes report violations but don't automatically
block a destination write. This document builds the real fix using
`control:if`.

## Hands-On Walkthrough — a quality gate that actually blocks a bad write

1. Open `silver_orders`. Add a **variable** node (`type = from_query`,
   `name = null_pk_count`,
   `query = SELECT count(*) FROM <predecessor's tmp view or table> WHERE order_id IS NULL`)
   right after the existing `not_null` quality node — this switches the
   pipeline to the advanced engine (per
   [`05-pipeline-builder/01-fundamentals.md`](../05-pipeline-builder/01-fundamentals.md)).
2. Add a **control** node, `type = if`,
   `condition = null_pk_count == 0`,
   `false_skip_nodes = [<the destination node's id>]` — this means: if
   the check finds any violation, the destination write is **skipped**,
   not silently executed anyway.
3. **Prove it blocks a real bad write**: temporarily inject a `NULL`
   `order_id` row into the upstream Bronze/Silver flow (e.g. via a
   Jupyter `INSERT` with a null key into a scratch copy table), point
   this pipeline at the scratch table, and run it.
   **Expected result**: the destination node shows `SKIPPED` in the run
   detail page, and the real Silver table is **not** overwritten with bad
   data — confirmed by checking its row count/content is unchanged from
   before this run.
4. Remove the injected bad row, re-point the pipeline back at the real
   source, re-run. **Expected result**: `null_pk_count = 0`, the `if`
   condition is true, and the destination node executes normally this
   time.

## Full negative-testing summary for this module

| Scenario | Detection | Prevention now in place |
|---|---|---|
| Duplicate `review_id` (doc 02) | uniqueness audit query | dedup node in `silver_reviews` |
| Schema drift (doc 03) | schema-baseline comparison | run before each re-ingestion |
| Deleted dimension row (doc 04) | orphan-count query | rebuild dimension, re-check |
| Corrupted fact total (doc 06) | cross-fact consistency query | rebuild fact table, re-check |
| Bad row reaching a destination (this doc) | `not_null` + `control:if` | write is skipped, not executed |

> 🧪 **Checkpoint for the whole module**: you built a real quality gate
> that genuinely blocks a bad write (not just reports it), and can point
> to 5 different real failure scenarios you personally reproduced and
> fixed across this module.

## Next module

[`11-lineage-and-governance/01-lineage.md`](../11-lineage-and-governance/01-lineage.md).
