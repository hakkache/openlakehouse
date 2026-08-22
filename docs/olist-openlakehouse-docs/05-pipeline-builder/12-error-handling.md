# 12 — Error Handling

**Content type: CURRENT PLATFORM CAPABILITY (verified) + PROJECT IMPLEMENTATION.**

## Fail-fast semantics (verified from `_run_node_sequence`)

Both engines share the same rule: if any node in the top-level execution
order fails, **remaining nodes are skipped**, not executed — a pipeline
run stops at the first real failure rather than continuing with
partial/undefined state.

## Hands-On Walkthrough — force a real failure and observe the stop

1. Create pipeline `error_handling_demo` with 3 nodes in sequence:
   - Code node (`sql`): a query that succeeds,
     `SELECT count(*) FROM iceberg.silver.olist_orders`.
   - Code node (`sql`): a **deliberately broken** query,
     `SELECT count(*) FROM iceberg.silver.olist_orders_typo_table`
     (a table name that doesn't exist).
   - Code node (`sql`): another query that would succeed,
     `SELECT count(*) FROM iceberg.silver.olist_customers`.
2. Run the pipeline. **Expected result**: node 1 shows `SUCCESS`; node 2
   shows `FAILED` with a real Trino error message
   (`TABLE_NOT_FOUND`/`does not exist`); node 3 shows `SKIPPED` — never
   attempted, confirming fail-fast, not best-effort execution.
3. Fix node 2's table name, re-run. **Expected result**: all 3 nodes now
   show `SUCCESS`, including node 3 this time.

## What this means for pipeline design

Put your **quality gates before destination writes** (as recommended in
[`04-silver-transformation/07-data-quality-gates.md`](../04-silver-transformation/07-data-quality-gates.md))
— but remember quality nodes reporting a nonzero violation count do
**not** themselves raise `ExecutionError` (they report, they don't fail
the run automatically, per that document's noted limitation). A real
"stop the pipeline if quality fails" gate today requires an explicit
`control:if` node reading the quality result via a `from_query` variable
and conditionally skipping the destination node — build this yourself in
[`10-data-quality/08-quality-failure-scenarios.md`](../10-data-quality/08-quality-failure-scenarios.md).

> 🧪 **Checkpoint**: you triggered a real node failure, watched a
> downstream node get skipped (not run), fixed the failure, and confirmed
> a clean re-run.

## Next document

[`13-reusable-pipelines.md`](13-reusable-pipelines.md).
