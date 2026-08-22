# 14 — Simple vs Advanced: One Master Comparison Table

**Content type: REFERENCE, synthesizing modules 01-13.**

## Does this node kind trigger `mode: advanced`?

| Node kind | Types | Triggers advanced mode? |
|---|---|---|
| `source` | `iceberg_table` (+8 UI-only) | No |
| `transform` | all 14 real types | No |
| `quality` | all 6 real types | No |
| `destination` | all 3 real types | No |
| `variable` | `literal`, `from_query` | **Yes** |
| `code` | `sql`, `python`, `pyspark` | **Yes** |
| `control` | `if`, `for_each` | **Yes** |
| `api_ingestion` | `rest_get`, `rest_post` | **Yes** |
| `sub_pipeline` | `call` | **Yes** |
| `dbt` | `run`, `test`, `build` | **Yes** |

**One node of any right-hand-column kind, anywhere in the graph — even
disconnected — flips the entire pipeline to `mode: advanced`.** There is
no partial/mixed mode.

## Decision table: which engine should I deliberately design for?

| If your pipeline needs... | Use | Why |
|---|---|---|
| A straight read → clean → gate → write, no branching/looping | Simple (`source`/`transform`/`quality`/`destination` only) | One compiled query, fastest, one `EXPLAIN`-able plan in Trino |
| A value computed once and reused in multiple places (e.g. "today's row count") | Advanced (`variable: from_query`) | No simple-mode equivalent — CTEs can't hold cross-node state the same way |
| Different logic depending on live data (e.g. skip a step if a table is empty) | Advanced (`control: if`) | Simple mode has no conditional node execution |
| The same sub-logic applied to N items (e.g. one check per table) | Advanced (`control: for_each`) | Simple mode has no looping construct |
| Data enrichment from an external live API | Advanced (`api_ingestion`) | Requires a real synchronous HTTP call mid-pipeline |
| Reusing another pipeline's logic without copy-pasting nodes | Advanced (`sub_pipeline`) | Only way to compose pipelines |
| Driving dbt models/tests as part of a larger flow | Advanced (`dbt`) | Only way to invoke the real dbt CLI from a pipeline |
| Arbitrary Python/pandas logic, or a real distributed Spark job | Advanced (`code: python`/`pyspark`) | Simple mode is SQL-only; also requires an elevated role |

## Practical performance implication, verified from the two engines' real designs

- **Simple mode** = 1 Trino round trip regardless of transform-node
  count — good for pipelines with many chained transforms but no
  external dependencies.
- **Advanced mode** = 1 round trip **per node** (each source/transform
  becomes its own materialized view query) plus real external latency
  for `api_ingestion`/`code:pyspark`/`dbt`/`sub_pipeline` nodes — expect
  materially slower wall-clock time for equivalent row-processing logic.
  This is a real, measurable trade-off, not a theoretical one: time both
  versions of the same logic yourself (module 15, scenario 1) to see the
  difference on real Olist data.

## Hands-On Walkthrough — measure the real difference yourself

1. Build the same logic two ways: **Pipeline S** (simple mode: source →
   3 chained transforms → destination) and **Pipeline A** (advanced
   mode: identical transforms, but with one throwaway `variable(literal)`
   node added so it's forced into advanced mode).
2. Run each 3 times, note each run's total wall-clock duration from the
   run history page.
3. **Expected result**: Pipeline A is measurably slower on every run
   (typically due to the extra per-node view materialization overhead) —
   confirm this is consistent across all 3 runs of each, not a one-off
   fluke.

> 🧪 **Checkpoint**: you can state, from memory, exactly which single
> node kind addition forces `mode: advanced`, and you've personally
> measured a real timing difference between equivalent simple- and
> advanced-mode pipelines.

## Next document

[`15-end-to-end-scenarios.md`](15-end-to-end-scenarios.md).
