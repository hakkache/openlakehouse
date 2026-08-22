# 05 — Backfills via Dagster

**Content type: PROJECT IMPLEMENTATION.** Combines
[`08-advanced-data-engineering/06-backfills-and-replay.md`](../08-advanced-data-engineering/06-backfills-and-replay.md)'s
backfill concept with Dagster as the trigger mechanism, instead of
manually re-running a pipeline from the `/pipelines` UI.

## Hands-On Walkthrough — trigger a backfill run from Dagster's Launchpad

1. Recall the scenario from
   [`08-advanced-data-engineering/06-backfills-and-replay.md`](../08-advanced-data-engineering/06-backfills-and-replay.md):
   a fixed `is_late` bug needs the `silver_orders` pipeline re-run once
   against unchanged Bronze data.
2. Instead of clicking **Run** on the `/pipelines` page, open Dagster's
   Launchpad ([`01-dagster-fundamentals.md`](01-dagster-fundamentals.md))
   and launch `run_pipeline_job` with `silver_orders`'s real
   `pipeline_id`.
3. **Expected result**: identical outcome to a manual re-run (same
   `_run_pipeline` code path), but now with Dagster's own run history,
   logs, and (if you added retries in
   [`04-retries-and-failure-recovery.md`](04-retries-and-failure-recovery.md))
   retry protection — a real operational benefit of routing backfills
   through Dagster rather than manual UI clicks, for anything you'd want
   an audit trail of.

## A real multi-run backfill: re-processing several pipelines in one operator session

4. If your bug affected multiple downstream pipelines (e.g.
   `silver_orders` → any Gold pipeline reading from it →
   `mart_olist_order_summary` via `dbt:build`), launch each affected
   pipeline's `run_pipeline_job` **in dependency order**, waiting for each
   to reach `SUCCESS` in Dagster's UI before launching the next — this
   manual sequencing is today's real, correct way to backfill a multi-
   stage chain (cross-reference
   [`02-pipeline-dependencies.md`](02-pipeline-dependencies.md)'s honest
   statement that Dagster has no native multi-pipeline DAG yet; a
   `sub_pipeline`-chained parent pipeline, as shown there, is the
   alternative if you want this automated in one trigger).

> 🧪 **Checkpoint**: you backfilled a real bug fix by triggering the
> affected pipeline from Dagster instead of the `/pipelines` UI directly,
> and can explain the concrete operational benefit (audit trail, retry
> eligibility) of doing it this way.

## Next document

[`06-production-orchestration.md`](06-production-orchestration.md).
