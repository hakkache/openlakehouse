# 01 — Pipeline Builder Fundamentals

**Content type: CURRENT PLATFORM CAPABILITY (verified from source).**

## Two engines under one canvas

The Pipeline Builder actually contains **two execution engines**, chosen
automatically based on what node kinds you use:

| Engine | Used when... | How it runs | Source |
|---|---|---|---|
| **Single-SQL compiler** | Pipeline uses only `source`/`transform`/`quality`/`destination` nodes | Whole pipeline compiles to **one** `WITH ...` Trino statement | `pipeline_compiler.py` |
| **Step-by-step executor** | Pipeline uses any `variable`/`code`/`control`/`api_ingestion`/`sub_pipeline`/`dbt` node | Each node runs individually; `source`/`transform` nodes materialize as real Trino **views** under `iceberg.tmp` instead of CTEs | `pipeline_executor.py` |

Every pipeline you built in module 04 (`silver_orders`, etc.) used only
the first engine. This module's later documents (06-11) introduce the
second, "advanced" engine.

## The 10 real node kinds

**Verified from `backend/app/schemas/pipeline.py`**:

```
source, transform, quality, destination,   ← single-SQL engine
variable, code, control, api_ingestion,
sub_pipeline, dbt                          ← advanced engine
```

## Hands-On Walkthrough — see which engine compiled your pipeline

1. Open `http://localhost/pipelines` → your `silver_orders` pipeline.
2. Click **Compile**. Look at the response's `mode` field (visible in the
   raw compile output/network response, or a "Mode: SQL" badge in the UI
   if your version surfaces it).
   **Expected result**: `"mode": "sql"` — confirms this pipeline used the
   single-statement compiler.
3. Create a throwaway pipeline `advanced_engine_demo`. Add a single
   **variable** node (`type = literal`, `name = greeting`,
   `value = "hello"`). Click **Compile**.
   **Expected result**: `"mode": "advanced"` — the mere presence of one
   `variable` node switches the whole pipeline to the step-by-step
   executor, even with nothing else on the canvas.

> 🧪 **Checkpoint**: you've directly observed the engine-selection rule —
> any advanced-kind node anywhere in the graph switches the entire
> pipeline's execution mode, confirmed via the real `mode` field in two
> different pipelines.

## Next document

[`02-basic-nodes.md`](02-basic-nodes.md).
