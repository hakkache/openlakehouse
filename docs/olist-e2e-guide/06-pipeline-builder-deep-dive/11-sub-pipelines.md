# 11 — Sub-Pipelines

**Content type: CURRENT PLATFORM CAPABILITY, verified from
`_run_sub_pipeline` in `pipeline_executor.py`.**

## Config reference

| Config key | Required | Notes |
|---|---|---|
| `pipeline_id` | yes | the real saved Pipeline's UUID to invoke |
| `pass_variables` | no (default `true`) | if `true`, the child shares (and can mutate) the parent's `ctx.variables`; results merge back into the parent after the call |

**Real cyclic-call guard, verified directly**:
```python
if pipeline_id in ctx.call_stack:
    raise ExecutionError(f"sub_pipeline node {node.id}: cyclic call detected for pipeline {pipeline_id}")
```
`ctx.call_stack` accumulates every pipeline ID in the current call chain
— this catches not just direct self-calls but also indirect A→B→A cycles.

## Scenario 1 (Simple) — build a reusable child pipeline

1. Build and save `qc_not_null_check`: `variable(from_query,
   name="table_name", value="olist_orders")` (a placeholder — real
   parameterization happens via `pass_variables`) → `code:sql`,
   `query="SELECT count(*) AS n FROM iceberg.silver.{{ table_name }} WHERE order_id IS NULL"`,
   `result_variable="null_count"`.
2. Note this pipeline's real UUID (from its URL or API response after
   saving).

## Scenario 2 (Medium) — call it from a parent, with variable passing

3. Build `parent_orders_pipeline`: `variable(literal,
   name="table_name", value="olist_orders")` → `sub_pipeline`
   (`type="call"`, `config={"pipeline_id": "<qc_not_null_check's UUID>",
   "pass_variables": true}`) → a final `code:sql` node using
   `{{ null_count }}` (the child's own result variable).
4. Run. **Expected result**: the child pipeline executes inline, and
   crucially — because `pass_variables=true` — the **parent's**
   downstream node can read `{{ null_count }}` even though that variable
   was only ever set inside the child. Confirm this in the run detail:
   you should see both the parent's and child's nodes listed, with the
   child's nodes nested under the `sub_pipeline` node.

## Scenario 3 (Medium→Complex) — `pass_variables: false`, proving isolation

5. Change `pass_variables` to `false`, re-run. **Expected result**: the
   final parent node's `{{ null_count }}` reference now renders empty/
   fails — since the child ran with an **isolated** empty variable
   context and nothing merges back. This is a real, deliberate isolation
   mode for building "fire and forget" reusable sub-pipelines that
   shouldn't leak internal variable names into callers.

## Scenario 4 (Complex) — reproduce the real cyclic-call guard

6. Edit `qc_not_null_check` itself to add a `sub_pipeline` node calling
   **itself** (its own UUID). Run it directly. **Expected result**: a
   real `ExecutionError` —
   `"sub_pipeline node <id>: cyclic call detected for pipeline <id>"` —
   confirms infinite recursion is genuinely prevented, not just
   "unlikely."
7. **Indirect cycle test**: build `pipeline_A` calling `pipeline_B`,
   and edit `pipeline_B` to call `pipeline_A` back. Run `pipeline_A`.
   **Expected result**: the same cyclic-call error fires on the second
   hop — confirms `call_stack` tracks the whole chain, not just the
   immediate caller. Remove the back-reference afterward to restore both
   pipelines to a working state.

## Scenario 5 (Complex) — real reuse across the guide's own pipelines

8. Reuse `qc_not_null_check` (parameterized via `table_name`) from **3
   different** parent pipelines targeting different real Silver tables
   (`olist_orders`, `olist_customers`, `olist_products`) — confirming a
   single child pipeline genuinely generalizes across callers rather than
   being hardcoded to one table.

> 🧪 **Checkpoint**: built and called a real parameterized child
> pipeline with variable passing on and off, and reproduced both a
> direct and an indirect real cyclic-call `ExecutionError`.

## Next document

[`12-dbt-nodes.md`](12-dbt-nodes.md).
