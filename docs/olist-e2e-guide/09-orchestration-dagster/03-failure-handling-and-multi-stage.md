# 03 — Failure Handling and the Multi-Stage Workaround

## Scenario — real deterministic failure handling

1. Trigger `run_pipeline_job` with a deliberately invalid `pipeline_id`.
   **Expected result**: real `Failure("Pipeline <id> not found")`.
2. **Re-execute** the same failed run from Dagster's UI — confirm it
   fails identically (deterministic, not transient) — this proves the
   failure is a genuine data/config problem, not flaky infrastructure.

## The real, honest limitation: no native multi-op DAG

`repository.py` wraps exactly one op per job — there's no native Dagster
multi-pipeline dependency graph today (e.g. no built-in "run Silver, then
Gold, then quality-check, in that order, as one Dagster job with 3
steps").

## The real workaround: `sub_pipeline` chains

| Approach | Native Dagster support? | Real workaround |
|---|---|---|
| Multi-op Dagster job (Silver → Gold → QC as 3 Dagster ops) | No | — |
| One parent pipeline using `sub_pipeline` (`call`) nodes in sequence | N/A | ✅ build this instead |

3. Build a parent pipeline using **sub_pipeline** (`call`) nodes in
   sequence (Silver → Gold → quality-check pipeline, reusing module 06
   doc 11's patterns), and trigger that *one* parent pipeline from
   Dagster — sequential execution is guaranteed within one advanced-
   engine run, achieving the same real effect as a multi-stage DAG.

## A full real staggered production schedule

4. Set real staggered schedules: Silver pipelines at `0 2 * * *`, Gold
   pipelines at `0 3 * * *`, quality-check pipelines at `0 4 * * *`.
   Confirm all 3 tiers fire correctly via the sensor's tick history over
   a full day (or simulate by temporarily using minute-level crons and
   observing 3 separate staggered fires).

> 🧪 **Checkpoint**: reproduced a deterministic failure via re-execution,
> and built a multi-stage `sub_pipeline` chain as the real workaround for
> the platform's lack of a native multi-op job graph.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../10-data-quality-and-testing/00-index.md`](../10-data-quality-and-testing/00-index.md).
