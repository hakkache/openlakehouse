# 06 — Variables

**Content type: CURRENT PLATFORM CAPABILITY (verified) + PROJECT IMPLEMENTATION.**

## The two real variable types

- `literal`: a fixed value, with `{{other_var}}` template substitution
  supported in its string value.
- `from_query`: runs a SQL query and stores its **first result cell**
  into the variable.

## Hands-On Walkthrough

1. Create pipeline `variables_demo`.
2. Add a **variable** node: `type = literal`, `name = target_status`,
   `value = "delivered"`.
3. Add a second **variable** node: `type = from_query`,
   `name = order_count`,
   `query = SELECT count(*) FROM iceberg.silver.olist_orders WHERE order_status = '{{target_status}}'`.
4. Run the pipeline. On the run detail page, find `order_count`'s node
   result. **Expected result**: a row count around `96478` (the real
   count of `delivered` orders in this dataset) — proof the
   `{{target_status}}` template was substituted with the literal
   variable's actual value (`delivered`) before the query ran, not left
   as a literal `{{...}}` string.
5. Change step 2's `value` to `"canceled"`, re-run. **Expected result**:
   `order_count` now reports a much smaller number — the real count of
   canceled orders — confirming the whole chain re-evaluates correctly
   when the upstream variable changes.

## Why this matters: parameterizing a pipeline without editing its nodes

This is the mechanism behind
[`13-reusable-pipelines.md`](13-reusable-pipelines.md)'s reusable pipeline
pattern — a `literal` variable acts like a pipeline's "input parameter,"
and every downstream `from_query`/`code`/`api_ingestion` node can
reference it via `{{...}}` without needing its own hardcoded copy of the
value.

> 🧪 **Checkpoint**: you changed one literal variable's value and watched
> a downstream `from_query` variable's real result change accordingly,
> across two separate runs.

## Next document

[`07-control-flow.md`](07-control-flow.md).
