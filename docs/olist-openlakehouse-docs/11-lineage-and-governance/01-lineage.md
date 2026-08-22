# 01 — Lineage

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`backend/app/core/lineage.py` + `frontend/src/pages/LineagePage.tsx`).**

## How lineage is really derived (table-level, static, pipeline-definition-based)

**Verified from source**: `extract_pipeline_lineage` does **not**
introspect Trino/Iceberg at runtime — it walks each saved pipeline's own
JSON `definition` graph, backward from every `destination` node through
`transform`/`quality` nodes, until it hits `source` nodes, recording each
`source_fqn → destination_fqn` edge. The `GET /lineage` endpoint
aggregates this across **every saved pipeline** in the database into one
graph. This means: lineage is only as complete as the pipelines you've
actually built in Pipeline Builder — a table populated by Jupyter/Spark
directly (like your original Bronze ingestion, per
[`03-bronze-ingestion/`](../03-bronze-ingestion/)) will **not** appear as
a lineage source, since no pipeline definition describes that write.

## Hands-On Walkthrough — trace real lineage for `silver_orders`

1. Open `http://localhost/lineage`.
2. **Expected result**: a graph rendering every table connected by at
   least one pipeline you've built so far — `bronze.olist_orders →
   silver.olist_orders` (from your `silver_orders` pipeline, module 04),
   plus any Gold-layer edges from module 07's pipelines.
3. Use the search box to find `olist_orders`. **Expected result**: the
   page highlights the connected subgraph — exactly the tables reachable
   from/to `olist_orders`, not the entire unrelated graph.
4. Click the `silver.olist_orders` node. **Expected result**: node detail
   shows which real pipeline(s) wrote it.

## The real, honest gap: Bronze ingestion has no lineage edge

5. Confirm this gap yourself: check whether `raw.olist_orders_csv →
   bronze.olist_orders` appears anywhere in the graph. **Expected
   result**: it does **not** — because that ingestion was done via a
   Jupyter notebook (module 03), not a Pipeline Builder pipeline, so
   there's no `PipelineDefinition` to derive an edge from. This is a real,
   documented limitation, not a bug — cross-reference
   [`04-impact-analysis.md`](04-impact-analysis.md)'s honest discussion of
   what this means for real impact analysis.

> 🧪 **Checkpoint**: you traced a real lineage graph built entirely from
> your own saved pipelines, and can explain precisely why Bronze
> ingestion doesn't appear in it.

## Next document

[`02-er-model.md`](02-er-model.md).
