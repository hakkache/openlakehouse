# 02 — Pipeline Dependencies

**Content type: CURRENT PLATFORM CAPABILITY (limitation, verified) + PROPOSED EXTENSION.**

## The current reality: one op per run, no native multi-pipeline DAG

**Verified from `repository.py`**: `run_pipeline_job` wraps exactly one
op, `run_pipeline_op`, parameterized by a single `pipeline_id`. There is
no Dagster-native "run pipeline A, then B, then C" job definition today
— cross-pipeline ordering must be expressed a different way.

## Hands-On Walkthrough — the real way to express "run Silver, then Gold" today

1. Use the **sub_pipeline** node type from
   [`05-pipeline-builder/10-sub-pipelines.md`](../05-pipeline-builder/10-sub-pipelines.md)
   instead: build one parent pipeline, `orders_full_chain`, with 3
   `sub_pipeline:call` nodes in sequence calling `silver_orders`, then
   (once built) a Gold-layer pipeline, then a `qc_orders` check pipeline.
2. Because `sub_pipeline` nodes execute sequentially within one advanced-
   engine run, and Dagster triggers this *one* parent pipeline as *one*
   `run_pipeline_op` invocation, you get real ordered multi-stage
   execution without needing Dagster's own multi-op job graph.
3. Trigger `orders_full_chain` from Dagster (same Launchpad flow as
   [`01-dagster-fundamentals.md`](01-dagster-fundamentals.md)). Verify on
   the run detail page that all 3 sub-pipeline calls executed in order.

## Where real Dagster-native op dependencies would help (documented gap)

**PROPOSED EXTENSION**: a genuine `@job` with multiple explicitly-wired
`@op`s (e.g. `silver_op >> gold_op >> qc_op`) would give you Dagster's own
dependency graph visualization and per-op retry granularity — not
implemented today. If you want this, it requires adding new op/job
definitions to `repository.py` directly (a backend code change, not a
Pipeline Builder UI action) — out of scope for this documentation
repository's hands-on exercises, but a legitimate extension path.

> 🧪 **Checkpoint**: you built and triggered a 3-stage pipeline chain
> using nested `sub_pipeline` calls, and can explain why this is the
> current real technique for multi-pipeline ordering (as opposed to a
> Dagster-native multi-op job, which doesn't exist yet in this repo).

## Next document

[`03-scheduling.md`](03-scheduling.md).
