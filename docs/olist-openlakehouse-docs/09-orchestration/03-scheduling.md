# 03 — Scheduling

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`repository.py`) + PROJECT IMPLEMENTATION.**

## The real mechanism: a per-pipeline cron sensor, not a single global schedule

**Verified from `scheduled_pipelines_sensor`**: this sensor polls every
30 seconds, reads **every** saved Pipeline's own `definition.schedule`
cron string, and — using `croniter` to check whether that pipeline's cron
fired since the sensor's last tick — launches a real run for exactly that
`pipeline_id`. Each launched run gets a deduplicating `run_key` of
`f"{pipeline.id}:{next_fire.isoformat()}"`, so Dagster's own run-key
mechanism prevents accidentally double-triggering the same scheduled
fire.

## Hands-On Walkthrough — schedule a real pipeline and watch it fire

1. Open `http://localhost/pipelines`, open your `silver_orders` pipeline,
   find its **Pipeline settings** panel, and set `schedule = */2 * * * *`
   (every 2 minutes — frequent enough to observe within this walkthrough).
2. Save the pipeline.
3. Open Dagster's UI (`http://localhost:3001`) → **Sensors** →
   `scheduled_pipelines_sensor`. **Expected result**: status shows
   `RUNNING` (matches `DefaultSensorStatus.RUNNING` in the source).
4. Wait up to 2 minutes (do not poll repeatedly — Dagster's own tick
   history will show you the result once it fires). Check the sensor's
   **Tick history**. **Expected result**: a tick shows a launched run for
   your pipeline's UUID, matching the cron you set.
5. Confirm on the app's own pipeline run history
   (`http://localhost/pipelines` → `silver_orders` → run history):
   **Expected result**: a new run with `executed_by = "dagster"`, fired
   automatically, with no manual action from you after step 2.
6. **Turn it off** afterward: clear the `schedule` field and re-save, to
   avoid this pipeline re-running every 2 minutes indefinitely in your
   environment.

## Why the `run_key` deduplication matters (a real correctness guarantee)

If the sensor's 30-second poll happened to overlap oddly with a cron
boundary, `run_key`'s inclusion of the exact `next_fire` timestamp
ensures Dagster recognizes "I already launched a run for this exact
scheduled fire" and skips launching a duplicate — verify this yourself by
checking that your pipeline's run history in step 5 shows **exactly one**
new run per elapsed 2-minute interval, never two.

> 🧪 **Checkpoint**: you scheduled a real pipeline via its own
> `definition.schedule` field, watched Dagster's sensor tick history
> confirm a real automatic fire, and found exactly one corresponding run
> in the app's own history.

## Next document

[`04-retries-and-failure-recovery.md`](04-retries-and-failure-recovery.md).
