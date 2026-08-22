# 07 — Control Flow (if / for_each)

**Content type: CURRENT PLATFORM CAPABILITY (verified) + PROJECT IMPLEMENTATION.**

## `if`: branch on a variable

`config.condition` is a Python expression evaluated against the
`variables` dict; `config.true_skip_nodes`/`config.false_skip_nodes` list
which node ids to **skip** depending on the result (skip-list semantics,
not a "run these" list — verified from `_run_if`).

## Hands-On Walkthrough — `if`

1. Create pipeline `control_flow_if_demo`.
2. Variable node: `type = from_query`, `name = late_count`,
   `query = SELECT count(*) FROM iceberg.silver.olist_orders WHERE is_late = true`.
3. Add two **code** nodes (type `sql`, harmless queries that just
   `SELECT 'alert path'`/`SELECT 'ok path'` as placeholders representing
   two different downstream actions).
4. Add a **control** node, `type = if`, `condition = late_count > 5000`,
   `true_skip_nodes = [<ok-path node id>]`,
   `false_skip_nodes = [<alert-path node id>]`.
5. Run the pipeline. Check the run detail page's per-node statuses.
   **Expected result**: given this dataset's real late-order count is
   well above 5000, the "ok path" node shows a **skipped** status and the
   "alert path" node actually executed — real conditional branching
   driven by a real number computed from your own data.

## `for_each`: loop a variable, re-run a body

`config.variable` names a variable holding a **list**;
`config.body_node_ids` lists node ids to re-execute once per item
(excluded from the pipeline's normal top-level order — verified from
`_run_for_each`). Iterations are strictly sequential (documented
limitation, no parallelism).

## Hands-On Walkthrough — `for_each`

6. Create pipeline `control_flow_for_each_demo`.
7. Variable node: `type = literal`, `name = statuses`,
   `value = ["delivered", "shipped", "canceled"]`.
8. Add a **code** node (`type = sql`) as the loop body:
   `SELECT count(*) FROM iceberg.silver.olist_orders WHERE order_status = '{{item}}'`
   (check your Pipeline Builder's exact per-iteration variable name
   convention — commonly `item` or the loop variable's singular form;
   confirm via the node's config help text).
9. Add a **control** node, `type = for_each`, `variable = statuses`,
   `body_node_ids = [<step 8's node id>]`.
10. Run. **Expected result**: the run detail page shows 3 separate
    executions of the same body node id, each with a different
    `iteration_index` (0, 1, 2) and a different real row-count result —
    confirms the loop actually re-ran the same node 3 times against 3
    different values, not just once.

> 🧪 **Checkpoint**: you saw one node skipped by a real `if` condition and
> one node executed 3 times by a real `for_each` loop, both driven by
> genuine data-derived values.

## Next document

[`08-python-pyspark-sql.md`](08-python-pyspark-sql.md).
