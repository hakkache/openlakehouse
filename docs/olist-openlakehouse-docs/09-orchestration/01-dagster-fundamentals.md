# 01 — Dagster Fundamentals

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`infra/dagster/repository.py`) + PROJECT IMPLEMENTATION.**

## Real architecture: Dagster reuses the exact same execution path as the API

**Verified from the module docstring**: a Dagster-triggered pipeline run
calls `app.api.v1.pipelines._run_pipeline` directly — the *same* function
an API-triggered run uses. There is no separate/fake Dagster execution
path; Dagster is a real trigger mechanism (scheduling, retries, tracked
runs) wrapped around the identical Trino execution you've used all
along.

## Hands-On Walkthrough — trigger your first Dagster-orchestrated run

1. Open Dagster's UI directly (not Traefik-proxied, per this project's
   established pattern for admin UIs): `http://localhost:3001`.
2. In the left nav, click **Jobs** → `run_pipeline_job`.
3. Click **Launchpad**, and in the config editor supply:
   ```yaml
   ops:
     run_pipeline_op:
       config:
         pipeline_id: "<a real pipeline UUID from your /pipelines page>"
   ```
   (get a real UUID by opening any pipeline you built earlier, e.g.
   `silver_orders`, and checking its URL or the API response for its
   `id`).
4. Click **Launch Run**. **Expected result**: Dagster's real-time run
   view shows live log lines — `"Executing pipeline <id> via run <run_id>
   (dagster run <dagster_run_id>)"` — confirming this is the exact
   `run_pipeline_op` code from `repository.py`, not a placeholder.
5. Cross-check in the app: `http://localhost/pipelines`, open the same
   pipeline's run history. **Expected result**: a new run appears with
   `executed_by = "dagster"` and the same `dagster_run_id` — proof the
   two systems share one real run record, not two disconnected ones.

> 🧪 **Checkpoint**: you launched a real pipeline run from Dagster's UI
> and found the exact same run reflected in the OpenLakehouse app's own
> pipeline run history.

## Next document

[`02-pipeline-dependencies.md`](02-pipeline-dependencies.md).
