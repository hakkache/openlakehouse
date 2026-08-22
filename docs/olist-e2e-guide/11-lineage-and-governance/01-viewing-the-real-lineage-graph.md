# 01 — Viewing the Real Lineage Graph

## The real, honest scope of lineage in this platform

Lineage is **table-level**, statically derived by parsing every **saved**
Pipeline definition's source/destination nodes — it is not a runtime
data-flow tracer. Two important real gaps:

| Gap | Why | How to confirm it yourself |
|---|---|---|
| No edge into Bronze tables | Bronze ingestion (module 04) is done in Jupyter/Spark, not a saved Pipeline | Open the Lineage page — Bronze tables appear as unexplained "roots" |
| Reflects definitions, not physical reality | Lineage is derived from **current** saved pipeline definitions | Delete a pipeline (doc 02) and watch its edge vanish even though the physical table still exists |

## Hands-On Walkthrough

1. Open the app's **Lineage** page. **Expected result**: a graph where
   every Silver/Gold table you built in modules 05-08 shows an edge from
   its real source pipeline, and Bronze tables appear with no inbound
   edge (confirm this gap yourself).

> 🧪 **Checkpoint**: you've located at least one Bronze table in the
> lineage graph with no inbound edge, and can explain why in one
> sentence.

## Next document

[`02-impact-analysis.md`](02-impact-analysis.md).
