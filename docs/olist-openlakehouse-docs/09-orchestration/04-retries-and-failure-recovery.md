# 04 — Retries and Failure Recovery

**Content type: CURRENT PLATFORM CAPABILITY (verified) + PROJECT IMPLEMENTATION.**

## What happens today on a real op failure

**Verified from `run_pipeline_op`**: if `_run_pipeline` finishes with any
status other than `SUCCESS`, the op raises `dagster.Failure` with the
real stored error message. Dagster marks the run `FAILURE`. There is no
op-level `retry_policy` configured on `run_pipeline_op` today (a
documented gap, not a hidden feature) — a failed run does not
automatically retry.

## Hands-On Walkthrough — force a real failure and recover manually

1. Trigger `run_pipeline_job` from Dagster's Launchpad
   ([`01-dagster-fundamentals.md`](01-dagster-fundamentals.md)) with a
   deliberately invalid `pipeline_id` (a random UUID that doesn't exist).
2. **Expected result**: the run fails with the real error
   `"Pipeline <id> not found"` — genuine `Failure` propagation, visible in
   Dagster's run log.
3. In Dagster's UI, on the failed run's page, click **Re-execute** (uses
   the exact same config). **Expected result**: fails again identically
   — proves this is a genuine, deterministic failure, not a transient one
   (a good sanity check before assuming a "retry" would ever help here).
4. Now trigger it again with a **real** `pipeline_id` but one whose
   pipeline definition references a table that doesn't exist yet (e.g.
   point a `source` node at `bronze.olist_orders_typo`).
   **Expected result**: fails with a real Trino "table not found" error,
   propagated through `_run_pipeline`'s stored `error` field into
   Dagster's `Failure` message — confirms error messages genuinely
   surface the real underlying cause, not a generic "failed" string.

## Adding real retry behavior (a legitimate extension you can make)

**PROPOSED EXTENSION**: add `retry_policy=RetryPolicy(max_retries=3,
delay=30)` to `run_pipeline_op`'s decorator in `repository.py` — this is
a real, standard Dagster feature, simply not turned on for this op today.
This is a backend code change (not a Pipeline Builder UI action); if you
make it, rebuild the Dagster user-code container
(`docker compose build dagster-webserver dagster-daemon && docker compose
up -d --force-recreate`) for it to take effect, and re-run this
document's Scenario 4 to confirm the retry count now appears in the run's
event log before it finally fails.

> 🧪 **Checkpoint**: you triggered 2 real distinct failure types, saw
> their genuine root-cause error messages surfaced end-to-end, and
> confirmed re-execution is deterministic (not retried automatically
> today).

## Next document

[`05-backfills.md`](05-backfills.md).
