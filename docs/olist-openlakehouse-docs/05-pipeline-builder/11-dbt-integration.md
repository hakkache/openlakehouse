# 11 — dbt Integration in the Pipeline Builder

**Content type: CURRENT PLATFORM CAPABILITY (verified) + PROJECT IMPLEMENTATION.**

## What a `dbt` node really does

**Verified from `app/core/dbt_client.py`**: a `dbt` node (`run`/`test`/
`build`) is a thin real proxy to the dbt-runner FastAPI wrapper container
(`infra/dbt/server.py`) — it genuinely executes `dbt run --select
<select>` (or `dbt test`/`dbt build`) inside the real dbt project
container, synchronously, and can take anywhere from seconds to minutes.
This is not a simulated status — it's the actual dbt CLI running against
your actual models (full depth covered in module 06).

## Hands-On Walkthrough — run a dbt model from inside a pipeline

*(Requires module 06's dbt project to already have at least one model —
if you haven't built module 06 yet, come back to this document after.)*

1. Create pipeline `dbt_node_demo`.
2. Add a **dbt** node, `type = run`, `select = stg_olist_orders` (or
   whichever staging model name you used in module 06).
3. Run the pipeline. **Expected result**: the run detail page shows this
   node's real dbt CLI output (model compiled, executed, "1 of 1 OK
   created..." style output) — genuine dbt logs, not a mock string.
4. Add a second **dbt** node, `type = test`, `select = stg_olist_orders`.
   Run again. **Expected result**: real dbt test output — pass/fail
   counts for whatever schema tests you defined on that model in module
   06's `_staging.yml`.

## Why chain dbt inside a Pipeline Builder run at all

This lets a single pipeline run represent an entire "load then transform
then test" cycle: e.g. a `source`/`destination` step lands new Bronze
data, then a `dbt` node immediately runs the dependent staging/mart
models, then a `dbt test` node validates them — all as one auditable
run with one row-count/status history, instead of 3 separately-triggered
jobs with no visible relationship between them.

> 🧪 **Checkpoint**: you triggered a real `dbt run` and a real `dbt test`
> from inside a Pipeline Builder run and saw genuine dbt CLI output in the
> run detail page.

## Next document

[`12-error-handling.md`](12-error-handling.md).
