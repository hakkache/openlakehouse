# 07 — Variables

**Content type: CURRENT PLATFORM CAPABILITY, verified from
`pipeline_executor.py`'s variable-node branch.** Adding any `variable`
node switches the whole pipeline to `mode: advanced` (module 01).

## Config reference

| Type | Required config keys | Behavior |
|---|---|---|
| `literal` | `name`, `value` | `ctx.variables[name] = render_template(value, ctx.variables)` — value can itself reference earlier variables via `{{ }}` |
| `from_query` | `name`, `query` | runs `query` via the pipeline's Trino cursor, stores the **first column of the first row** as `ctx.variables[name]` |

Every downstream node's string config (SQL `query`, `condition`,
`expression`, `url`, `code`) is passed through the same `_render_template`
Jinja-style substitution, so `{{ variable_name }}` works anywhere.

## Scenario 1 (Simple) — `literal`, and proving templating chains

1. Pipeline `variables_demo`: add a `variable` node,
   `type=literal`, `name="target_status"`, `value="delivered"`.
2. Add a second `variable` node, `type=literal`,
   `name="message"`, `value="Filtering for status: {{ target_status }}"`.
3. Add a `code:sql` node, `query="SELECT '{{ message }}' AS msg"`. Run.
   **Expected result**: the node's logged result shows the real string
   `"Filtering for status: delivered"` — confirms chained variable
   substitution works, not just single-level.

## Scenario 2 (Medium) — `from_query`, a real live count driving logic

4. Add a `variable` node, `type=from_query`, `name="order_count"`,
   `query="SELECT count(*) FROM iceberg.silver.olist_orders"`.
5. Add a `code:sql` node using it:
   `query="SELECT {{ order_count }} * 1.0 / 99441 AS coverage_ratio"`.
   **Expected result**: a real ratio close to `1.0` if your Silver table
   is complete — this is a genuine, live-computed value, not a
   placeholder.

## Scenario 3 (Medium→Complex) — a real quality-driven variable

6. Add a `variable` node, `type=from_query`, `name="null_pk_count"`,
   `query="SELECT count(*) FROM iceberg.silver.olist_orders WHERE order_id IS NULL"`.
   **Expected**: `0` against clean data.
7. **Negative test**: temporarily point the query at a deliberately
   dirty table/column (or add `WHERE 1=0` inverted to force a fake
   positive, e.g. `SELECT count(*) FROM ... WHERE order_id IS NOT NULL`
   to simulate "found problems"). Confirm the variable's real value
   changes accordingly — this exact pattern is what feeds a
   `control:if` gate in [`08-control-flow.md`](08-control-flow.md).

## Scenario 4 (Complex) — `from_query` returning a non-scalar shape, and the real failure

8. Point a `from_query` variable at a query returning **multiple
   columns** (e.g. `SELECT order_id, customer_id FROM ... LIMIT 1`).
   **Expected result**: the variable still gets set — but only to the
   **first column's value** (`row[0]`), per the executor's real
   behavior (`value = row[0] if row else None`) — the second column is
   silently discarded. Confirm this yourself by templating both the
   expected and a clearly-wrong value into a downstream node and
   observing which one appears.

## The real risk: unrendered/broken templates fail at the consuming node, not the variable node

9. Reference a variable that doesn't exist, e.g. `{{ typo_name }}`, in a
   `code:sql` node's query. **Expected result**: depending on your
   templating engine's strictness, this either renders as an empty
   string or raises at the **consuming** node (not the variable node
   itself) — confirm which happens in your version, since it changes
   where you'll look when debugging a real broken pipeline.

> 🧪 **Checkpoint**: chained 2 literal variables together, computed 1
> real `from_query` ratio, and confirmed the real "first column only"
> truncation behavior for multi-column `from_query` results.

## Next document

[`08-control-flow.md`](08-control-flow.md).
