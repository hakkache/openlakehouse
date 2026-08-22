# 08 — Control Flow: if and for_each

**Content type: CURRENT PLATFORM CAPABILITY, verified from `_run_if`/
`_run_for_each` in `pipeline_executor.py`.**

## `if` — config reference

| Config key | Required | Meaning |
|---|---|---|
| `condition` | yes | a Python expression, evaluated via `eval(condition, {"__builtins__": {}}, dict(ctx.variables))` — **real Python syntax**, not SQL, and variables are available by name directly (not `{{ }}`-wrapped) |
| `true_skip_nodes` | no | node IDs to **skip** when `condition` is `True` |
| `false_skip_nodes` | no | node IDs to **skip** when `condition` is `False` |

**Important, verified real detail**: the condition is evaluated with
`__builtins__` stripped — you cannot call arbitrary Python builtins
(`open`, `import`, etc.) inside it, only reference variables and use
Python operators (`>`, `and`, `or`, `==`, ...). This is a deliberate
sandboxing choice.

## `for_each` — config reference

| Config key | Required | Meaning |
|---|---|---|
| `items_variable` | yes | name of a variable holding a **list** |
| `item_variable` | no (default `"item"`) | name each iteration's current element is bound to |
| `body_node_ids` | yes | node IDs to run once per item |

If `items_variable` doesn't resolve to a real Python `list`, you get a
real `ExecutionError` — confirmed directly in the executor's source.

## Scenario 1 (Simple) — `if`, gating a destination write

1. Pipeline `conditional_write`: `variable(from_query, name=order_count,
   query="SELECT count(*) FROM iceberg.silver.olist_orders")` →
   `control(if, condition="order_count > 0",
   false_skip_nodes=["dest_node_id"])` → `destination(iceberg_gold,
   table=conditional_output)`.
2. Run. **Expected result**: since real `order_count` is `99441 > 0`,
   the destination node **runs** (condition is `True`, so
   `false_skip_nodes` — which only applies when the condition is
   `False` — never triggers).
3. **Negative test**: change the condition to `order_count > 999999999`
   (impossible against real data). Re-run. **Expected**: the condition
   evaluates `False`, `false_skip_nodes` fires, and the destination
   node's status shows `SKIPPED` — confirm the destination table is
   genuinely **not** created/updated.

## Scenario 2 (Medium) — `for_each`, iterating real order statuses

4. Pipeline `per_status_counts`: `variable(literal, name=statuses,
   value=["delivered","shipped","canceled","processing"])` →
   `control(for_each, items_variable="statuses", item_variable="status",
   body_node_ids=["count_node"])` → inside the loop, `code:sql`
   (`count_node`): `query="SELECT count(*) FROM
   iceberg.silver.olist_orders WHERE order_status = '{{ status }}'"`.
5. Run, inspect the run detail page. **Expected result**: 4 separate
   `NodeRunStatus` rows for `count_node`, each with a distinct
   `iteration_index` (0-3) and `parent_node_id` pointing at the
   `for_each` node — with a real, different count logged for each
   status.

## Scenario 3 (Medium→Complex) — nested logic: `if` inside a `for_each` body

6. Extend the loop body: add a second node inside `body_node_ids`, a
   `control:if` checking `condition="item == 'canceled'"`, skipping a
   downstream alert-log `code:sql` node unless true. **Expected result**:
   the alert node only executes (shows `SUCCESS`, not `SKIPPED`) on the
   iteration where `item == "canceled"` — confirm across all 4
   iterations in the run detail.

## Scenario 4 (Complex) — a real type-mismatch failure

7. Set `items_variable` to point at a variable holding a plain string
   (not a list), e.g. `value="delivered"` instead of a JSON list.
   **Expected result**: a real `ExecutionError` —
   `"for_each node <id>: variable 'statuses' is not a list"` — confirms
   the executor validates the real Python type at runtime, not just at
   save time.

> 🧪 **Checkpoint**: gated a real destination write with `if`, iterated
> a real 4-item loop with `for_each` and observed per-iteration status
> rows, nested an `if` inside a loop body, and reproduced the real
> not-a-list `ExecutionError`.

## Next document

[`09-code-nodes-sql-python-pyspark.md`](09-code-nodes-sql-python-pyspark.md).
