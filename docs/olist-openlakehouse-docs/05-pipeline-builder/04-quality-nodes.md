# 04 — Quality Nodes Deep Dive

**Content type: PROJECT IMPLEMENTATION.** Module 04 already covered
`not_null`, `unique`, `regex`, `freshness` hands-on. This document covers
the 2 remaining: `range` and `row_count`, plus the one **unsupported**
type, `schema`.

## Hands-On Walkthrough — `range`: reject impossible prices

1. Open (or recreate) `gold_orders_with_items_demo` from
   [`03-transformations.md`](03-transformations.md).
2. Add a **range** quality node after the join, `column = price`,
   `min = 0` (no `max` — any positive price is plausible for this
   catalog).
3. Compile. **Expected SQL shape**:
   ```sql
   SELECT COUNT(*) AS violations FROM <predecessor> WHERE price < 0
   ```
4. Run the pipeline. **Expected result**: `violations = 0` — real Olist
   data has no negative prices.

## Hands-On Walkthrough — `row_count`: a sanity floor, not a pass/fail gate

5. Add a **row_count** quality node in parallel (same predecessor).
   Compile. **Expected SQL shape**: `SELECT COUNT(*) AS actual FROM
   <predecessor>` — note this node reports a raw count, it does **not**
   compare against a threshold itself (verified from the compiler: no
   `min`/`max` handling for `row_count`, unlike `range`). Use it as an
   observability signal on the run detail page (compare the reported
   `actual` against what you expect, e.g. `112650`), not as an automatic
   gate — if you need an automatic floor/ceiling, combine it with a
   `range` node on a `derived_column` that repeats the count, or check it
   manually per run.

## The `schema` type: real, but not yet compiled

6. Add a **schema** quality node anywhere, compile.
   **Expected result**: `CompileError: "schema quality node is not yet
   supported by the compiler"` — this is a genuine current platform gap
   (not a config mistake on your part). Track this as a known limitation;
   until it's implemented, use explicit `select`/`cast` nodes (module 04)
   to pin down the schema you expect instead.

## Quality node summary table (all 6 real types, verified)

| Type | Violation condition | Notes |
|---|---|---|
| `not_null` | any listed column is `NULL` | |
| `unique` | any listed column combo repeats | |
| `range` | value `< min` or `> max` | either bound optional |
| `regex` | value doesn't match pattern | applies `CAST(... AS VARCHAR)` first |
| `freshness` | timestamp older than `max_age_minutes` | needs a real "now" comparison — historical data needs a huge threshold |
| `row_count` | N/A — reports `actual`, no threshold logic | pair manually with an expected value |
| `schema` | N/A | **not compiled — always errors** |

> 🧪 **Checkpoint**: you've now exercised all 6 real quality types
> end-to-end and confirmed the one documented gap (`schema`) fails with a
> clear, expected error rather than a confusing one.

## Next document

[`05-advanced-nodes.md`](05-advanced-nodes.md) — the step-by-step
executor engine: variables, code, control flow, API ingestion,
sub-pipelines, and dbt nodes.
