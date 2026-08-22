# 09 — Code Nodes: sql / python / pyspark

**Content type: CURRENT PLATFORM CAPABILITY, verified from the `code`-kind
branch in `pipeline_executor.py` and `requires_elevated_role()`.**

## Config reference

| Type | Required config keys | Behavior |
|---|---|---|
| `sql` | `query` | runs raw SQL via the pipeline's cursor; optional `result_variable` stores the first row (scalar if 1 column, else a list) |
| `python` | `code` | executed via real `exec()` in a namespace `{"variables": ctx.variables}`; stdout/stderr captured and returned (truncated to 2000 chars) |
| `pyspark` | `code` | run via `run_pyspark_code(...)`, a **real Spark job** (`job_group=f"pipeline_{run_id}_{node_id}"`), with `variables` injected the same way |

## The real role gate — verified directly from source

```python
_ELEVATED_CODE_TYPES = {"python", "pyspark"}

def requires_elevated_role(defn: PipelineDefinition) -> bool:
    return any(n.kind == "code" and n.type in _ELEVATED_CODE_TYPES for n in defn.nodes)
```

`sql` code nodes are **not** elevated — only `python`/`pyspark`. This
check runs at **save or execute time** against the pipeline's real node
list, not just once at creation.

## Scenario 1 (Simple) — `code:sql`, ad-hoc logic no transform node covers

1. Pipeline `code_sql_demo`: a `code:sql` node,
   `query="SELECT count(*) AS n FROM iceberg.silver.olist_orders WHERE order_status = 'delivered'"`,
   `result_variable="delivered_count"`.
2. Run as any real user. **Expected result**: succeeds regardless of role
   — confirms `sql` code nodes are genuinely not elevated.

## Scenario 2 (Medium) — `code:python`, real stdout capture

3. Add a `code:python` node:
   ```python
   n = variables.get("delivered_count")
   print(f"Delivered orders: {n}")
   print(f"As percentage of total: {n/99441:.2%}")
   ```
4. Run as `admin.user` (or a `DATA_ENGINEER` user). **Expected result**:
   the node's logged output shows both real printed lines — confirms
   `variables` really is injected and stdout really is captured.
5. **Negative test — role gate**: log in as a `DATA_ANALYST` or `VIEWER`
   user, attempt to **save** or **run** this same pipeline. **Expected
   result**: a real `403` — confirms the elevated-role check fires
   before/at execution, not just hidden in the UI.

## Scenario 3 (Medium→Complex) — `code:pyspark`, a genuine Spark job

6. Add a `code:pyspark` node:
   ```python
   df = spark.table("iceberg.silver.olist_order_items")
   result = df.groupBy("order_id").count().filter("count > 3")
   print(f"Orders with more than 3 line items: {result.count()}")
   ```
7. Run as an elevated user. **Expected result**: real output showing a
   genuine count. **Verify independently**: open Spark's own UI while
   this runs — confirm a real application/job appears with
   `job_group = pipeline_<run_id>_<node_id>`, proving this executes as a
   real distributed Spark job, not an in-process shortcut.

## Scenario 4 (Complex) — a real uncaught exception inside a code node

8. Add a `code:python` node with a deliberate bug:
   ```python
   x = variables["this_key_does_not_exist"]
   ```
9. Run. **Expected result**: a real `KeyError` propagates up as the
   node's failure message — confirms exceptions inside `exec()`'d code
   are not silently swallowed, and (per module 08's fail-fast rules) any
   downstream nodes show `SKIPPED`.

## Scenario 5 (Complex) — templating inside code, and its real limits

10. Use `{{ delivered_count }}` inside a `code:python` node's `code`
    string (instead of reading `variables["delivered_count"]`).
    **Expected result**: this still works, since `code` is rendered
    through the same `_render_template` step before `exec()` — but if
    the templated value contains a comma/quote that breaks Python syntax
    (e.g. a variable holding a raw string with an unescaped quote), you
    get a real `SyntaxError` — confirm this by templating a
    string-valued variable directly into an unquoted Python expression.

> 🧪 **Checkpoint**: ran a non-elevated `sql` code node as any user,
> confirmed the real `403` role gate on `python`/`pyspark` for a
> non-elevated user, watched a real Spark job appear in Spark's UI from
> a `pyspark` node, and reproduced one real uncaught exception.

## Next document

[`10-api-ingestion.md`](10-api-ingestion.md).
