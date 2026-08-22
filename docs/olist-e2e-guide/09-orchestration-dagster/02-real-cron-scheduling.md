# 02 — Real Cron Scheduling

Scheduling is real and per-pipeline: `scheduled_pipelines_sensor` (30s
poll, `DefaultSensorStatus.RUNNING`) reads **every** saved pipeline's own
`definition.schedule` cron string via `croniter`, and launches a run only
for pipelines whose cron genuinely fired since the sensor's last cursor
tick — with a deduplicating
`run_key = f"{pipeline.id}:{next_fire.isoformat()}"`.

## Hands-On Walkthrough

1. Set `silver_orders`'s **Pipeline settings** → `schedule = */2 * * * *`.
2. Watch Dagster's **Sensors** → `scheduled_pipelines_sensor` → **Tick
   history** over the next few minutes. **Expected result**: a real
   automatic launch appears, matching your cron, with no manual action.
3. Clear the schedule afterward to stop it firing indefinitely.

## The real dedup key, and why it matters

| Scenario | `run_key` | Result |
|---|---|---|
| Sensor ticks twice within the same cron window | identical `run_key` (same `pipeline.id` + `next_fire`) | Dagster silently skips the 2nd launch — no duplicate run |
| Cron fires at 2 genuinely different times | different `run_key`s | 2 separate real runs |

## Negative test — an invalid cron is rejected at save time, not silently

4. Try to save a pipeline with `schedule = "not a real cron"`.
   **Expected result**: a real validation error from
   `PipelineDefinition`'s `_validate_schedule` field validator — this
   fails **fast, at save time**, specifically so an invalid cron never
   reaches the sensor and fails silently later.

> 🧪 **Checkpoint**: watched a real automatic cron-triggered run fire on
> its own, and reproduced the real save-time cron validation error.

## Next document

[`03-failure-handling-and-multi-stage.md`](03-failure-handling-and-multi-stage.md).
