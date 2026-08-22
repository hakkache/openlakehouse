# 10 — Sub-Pipelines

**Content type: CURRENT PLATFORM CAPABILITY (verified) + PROJECT IMPLEMENTATION.**

## What it really does

A `sub_pipeline`/`call` node looks up another **saved** Pipeline by
reference and executes it inline, in the same run and same Trino session
— not a separate scheduled job. `config.pass_variables` (default `true`)
controls whether the parent's `variables` dict is shared with the child.
A call-stack guard prevents a pipeline from infinitely calling itself
(directly or transitively).

## Hands-On Walkthrough — build a reusable "quality check" sub-pipeline

1. Create pipeline `qc_not_null_check` (this will be the reusable child):
   - Variable node: `type = literal`, `name = table_name`,
     `value = "olist_orders"`.
   - Code node: `type = sql`,
     `code = SELECT count(*) FROM iceberg.silver.{{table_name}} WHERE order_id IS NULL`,
     `result_variable = null_violations`.
   Save it.
2. Create pipeline `orders_pipeline_with_qc` (the parent):
   - Add a **sub_pipeline** node, `type = call`, `pipeline = qc_not_null_check`,
     `pass_variables = true`.
   - Add a **variable** node *before* the sub_pipeline call, `type =
     literal`, `name = table_name`, `value = "olist_orders"` (overrides
     the child's own default, proving variables really do pass through).
3. Run `orders_pipeline_with_qc`. Check the run detail page.
   **Expected result**: the sub_pipeline node's execution shows the
   child's `null_violations` variable in the final state, equal to `0` —
   confirms the child ran inline, using the parent's `table_name` value.
4. **Negative test — the recursion guard**: edit `qc_not_null_check` to
   add a `sub_pipeline` node calling itself (`pipeline =
   qc_not_null_check`). Run it. **Expected result**: a real
   `ExecutionError` about exceeding the call-stack depth/self-reference,
   not an infinite hang — proof the guard is real. Remove this
   self-referencing node afterward so the pipeline is usable again.

## Why this matters

This is the real mechanism behind sharing one quality-check pipeline
across every Silver table instead of copy-pasting the same `not_null`
logic into every pipeline — see
[`13-reusable-pipelines.md`](13-reusable-pipelines.md) for the full
reuse pattern applied across all 9 Olist Silver tables.

> 🧪 **Checkpoint**: you ran a child pipeline through a parent, confirmed
> variable pass-through with a real value, and confirmed the recursion
> guard fires a real error instead of hanging.

## Next document

[`11-dbt-integration.md`](11-dbt-integration.md).
