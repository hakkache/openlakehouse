# 06 — Quality Nodes

**Content type: CURRENT PLATFORM CAPABILITY, verified from
`_compile_quality` in `pipeline_compiler.py`.**

## Config reference

| Type | Required config keys | Compiles to (returns a `violations`/`actual` count) |
|---|---|---|
| `not_null` | `columns: [str]` | `COUNT(*) WHERE col1 IS NULL OR col2 IS NULL ...` |
| `unique` | `columns: [str]` | `COUNT(*)` of groups with `COUNT(*) > 1` |
| `range` | `column`, `min` and/or `max` | `COUNT(*) WHERE col < min OR col > max` |
| `regex` | `column`, `pattern` | `COUNT(*) WHERE NOT regexp_like(CAST(col AS VARCHAR), pattern)` |
| `row_count` | none | `COUNT(*) AS actual` (no violations concept — just a real count) |
| `freshness` | `column`, `max_age_minutes` | `COUNT(*) WHERE col < now() - INTERVAL max_age_minutes MINUTE` |
| `schema` | — | **UI-only**: always raises `CompileError` |

Every quality node (except `row_count`) returns a `violations` count —
**it does not stop the pipeline by itself**. Blocking a bad write
requires wiring the count into a downstream `control:if` node (advanced
mode) — see [`08-control-flow.md`](08-control-flow.md) scenario 6 style
usage, and module 10 of the main guide.

## Scenario 1 (Simple) — `not_null` and `unique` on a real primary key

1. Pipeline `orders_pk_quality`: source `silver.orders_renamed` →
   `not_null` node `columns=["order_id"]` → `unique` node
   `columns=["order_id"]` → destination (any throwaway table, since this
   pipeline's real purpose is the quality check output itself).
2. Run, inspect each quality node's result. **Expected result**: both
   report `violations = 0` against real Silver data.

## Scenario 2 (Medium) — `range`, with a real violation you create yourself

3. Add a `range` node on `price`: `min=0`. Run against
   `silver.olist_order_items`. **Expected**: `violations = 0` (no
   negative real prices).
4. **Negative test**: temporarily change `min=10` (an artificially high
   floor). **Expected**: a real non-zero `violations` count — confirms
   the node is a genuine live predicate against your actual data, not a
   canned pass/fail.

## Scenario 3 (Medium) — `regex`, validating a real format

5. Add a `regex` node on `zip_code_prefix` (from `olist_customers` or
   `olist_sellers`), `pattern="^[0-9]{5}$"` (adjust to the real column's
   actual digit width — verify it first with
   `SELECT length(CAST(zip_code_prefix AS VARCHAR)) FROM ... LIMIT 20`).
   **Expected**: `violations = 0` if your pattern matches the real data's
   actual format — if not `0`, inspect a few violating rows directly to
   understand the real discrepancy (e.g. leading zeros dropped by
   `inferSchema` during Bronze ingestion — a genuine, checkable
   possibility).

## Scenario 4 (Medium→Complex) — `row_count`, as a real regression trip-wire

6. Add a `row_count` node (no config) on `silver.olist_customers`.
   **Expected**: `actual = 99441`. Use this node's output as a manual
   cross-check every time you rebuild this table in later modules — any
   deviation is a real signal something upstream changed.

## Scenario 5 (Complex) — `freshness`, proven with a deliberately stale row

7. Build a small staging table with a `_loaded_at` timestamp column,
   insert one row with `_loaded_at = current_timestamp - INTERVAL '2'
   DAY`. Add a `freshness` node: `column="_loaded_at"`,
   `max_age_minutes=60`. **Expected**: `violations = 1` — confirm the
   node genuinely computes elapsed time rather than checking a fixed
   date.

## Scenario 6 (Complex) — the UI-only `schema` type, confirmed to fail

8. Add a `schema` quality node (it's in the palette). **Compile**.
   **Expected result**: a hard `CompileError` —
   `"schema quality node is not yet supported by the compiler"` — this
   type exists in the spec/UI but has no real implementation; don't
   design around it.

> 🧪 **Checkpoint**: ran all 6 real quality node types against real
> Olist data, deliberately forced 1 real violation via a `range` node,
> and confirmed the `schema` type's real compile-time failure.

## Next document

[`07-variables.md`](07-variables.md).
