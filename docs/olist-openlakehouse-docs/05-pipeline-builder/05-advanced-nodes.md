# 05 — Advanced Nodes Overview

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`pipeline_executor.py`).**

## The 6 advanced node kinds

Any of these anywhere in a pipeline switches it to the step-by-step
executor (see [`01-fundamentals.md`](01-fundamentals.md)):

| Kind | Real types | What it does |
|---|---|---|
| `variable` | `literal`, `from_query` | sets a named entry in a shared `variables` dict for the run |
| `code` | `sql`, `python`, `pyspark` | runs arbitrary code with `variables` bound; python/pyspark require ADMIN/DATA_ENGINEER role |
| `control` | `if`, `for_each` | branches/loops over other node ids listed in its own config |
| `api_ingestion` | `rest_get`, `rest_post` | real HTTP call (httpx), stores JSON response into a variable |
| `sub_pipeline` | `call` | executes another saved pipeline inline, same run/session |
| `dbt` | `run`, `test`, `build` | invokes the real dbt project (module 06) from inside a pipeline |

## How `source`/`transform` nodes behave differently here

In the advanced executor, `source`/`transform` nodes still use the same
per-node SQL builders as the single-SQL compiler, but each one
materializes as a **real Trino view** under `iceberg.tmp` instead of a
CTE — so a `code:python`/`code:pyspark` node later in the same pipeline
can query that intermediate result by its view name.

## Hands-On Walkthrough — see a `tmp` view get created

1. Create pipeline `advanced_view_demo`. Add a source node
   `iceberg_table` / `bronze.olist_sellers`, then any **variable** node
   (`literal`, `name = trigger`, `value = "x"`) just to force advanced
   mode.
2. Run the pipeline (even though the variable node does nothing with the
   source — this is only to observe the mechanism).
3. In **SQL Editor**:
   ```sql
   SHOW TABLES FROM iceberg.tmp;
   ```
   **Expected result**: at least one view name referencing this run's
   source node — confirms the "materialize as a real Trino view"
   behavior described above, not an in-memory-only abstraction.

## Known limitations (documented, not hidden)

- `for_each` runs its iterations **sequentially**, no parallelism.
- `if`/`for_each` require you to explicitly list affected node ids in
  their own config (not inferred from the canvas graph shape).
- `python`/`pyspark` code nodes run at the same trust/role level as the
  Data Explorer's "PySpark Code" mode — restricted to ADMIN/DATA_ENGINEER.

> 🧪 **Checkpoint**: you found a real `iceberg.tmp` view created by a
> single pipeline run — proof the advanced engine's intermediate results
> are real, queryable Trino objects, not a hidden abstraction.

## Next document

[`06-variables.md`](06-variables.md).
