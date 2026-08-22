# 12 — dbt Nodes

**Content type: CURRENT PLATFORM CAPABILITY, verified from the
`dbt`-kind branch in `pipeline_executor.py`.**

## Config reference

| Config key | Required | Notes |
|---|---|---|
| `select` | yes | a real dbt node selector — model name, `tag:x`, `path:...`, `+model+`, etc. Passed straight to `dbt_client.run(node.type, select, full_refresh)` |
| `full_refresh` | no | appends `--full-refresh` to the real dbt CLI invocation |

`node.type` (`run`/`test`/`build`) is passed directly as the real dbt
subcommand — this node is a thin, faithful wrapper around the same
`dbt_client` used by the `/dbt` page (module 07 of this guide), not a
separate reimplementation.

## Scenario 1 (Simple) — `run`, a single model from inside a pipeline

1. Build `dbt_run_staging`: a single `dbt` node,
   `type="run"`, `config={"select": "stg_olist_orders"}` (the model built
   in module 07 of the main guide).
2. Run this pipeline. **Expected result**: the node's logged output shows
   real dbt CLI stdout (`Running with dbt=...`, `1 of 1 OK created
   ...stg_olist_orders`) — the exact same output you'd see running
   `dbt run --select stg_olist_orders` from a terminal.

## Scenario 2 (Medium) — `test`, and a real failure surfaced correctly

3. Build `dbt_test_orders`: a `dbt` node, `type="test"`,
   `select="stg_olist_orders"`. Run. **Expected**: passes, assuming
   module 07's tests are intact.
4. **Negative test**: temporarily break a real test (e.g. edit the schema
   YAML to add an impossible `accepted_values` list for `order_status`
   that excludes a real value like `delivered`). Re-run this pipeline
   node. **Expected result**: a real `ExecutionError` —
   `"dbt test --select stg_olist_orders failed (exit 1): ..."` with the
   real dbt test failure output tail included — confirms failures
   propagate with genuine diagnostic detail, not a generic message.
   Revert the schema YAML afterward.

## Scenario 3 (Medium→Complex) — `build`, and selector syntax

5. Build `dbt_build_chain`: a `dbt` node, `type="build"`,
   `select="+mart_olist_order_summary"` (the `+` prefix means "this model
   and everything it depends on," real dbt selector syntax). Run.
   **Expected result**: the full real staging→intermediate→mart chain
   builds **and** tests in one node, in dependency order — confirm by
   checking `iceberg.gold` (or wherever your dbt target schema points)
   for freshly-updated tables.

## Scenario 4 (Complex) — chaining a dbt node after a pipeline-produced table

6. Build `full_chain_demo`: a normal `source`→`transform`→
   `destination(iceberg_silver, table=stg_input_for_dbt)` sub-chain,
   followed by a `dbt` node, `type="run"`,
   `select="model_that_sources_stg_input_for_dbt"` (a dbt model you
   define with a `source()` pointing at `stg_input_for_dbt`). **Expected
   result**: this proves the two systems compose — Pipeline Builder can
   feed dbt's source layer directly, and both are driven from one
   pipeline run.

## Scenario 5 (Complex) — `full_refresh`, proven against an incremental model

7. Using module 07's `mart_olist_orders_incremental` model, add a `dbt`
   node with `select="mart_olist_orders_incremental"`,
   `full_refresh=false`. Run twice. **Expected**: 2nd run processes `0`
   new rows (as in module 07). Now set `full_refresh=true`, re-run.
   **Expected result**: a real full rebuild (all `99441` rows
   reprocessed) — confirm via dbt's own logged row counts in the node's
   output.

> 🧪 **Checkpoint**: ran, tested, and built real dbt models from inside a
> pipeline, reproduced one real dbt test failure with full diagnostic
> output, and proved `full_refresh` genuinely changes an incremental
> model's real behavior.

## Next document

[`13-error-handling-and-fail-fast.md`](13-error-handling-and-fail-fast.md).
