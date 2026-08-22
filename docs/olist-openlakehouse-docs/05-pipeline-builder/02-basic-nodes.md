# 02 — Basic Nodes (Source & Destination)

**Content type: CURRENT PLATFORM CAPABILITY (verified) + PROJECT IMPLEMENTATION.**

## Source types: 1 real, 8 UI-only

**Verified from `schemas/pipeline.py`'s `SOURCE_TYPES`**: the palette
offers `iceberg_table, csv, json, parquet, rest_api, postgresql, mysql,
sqlserver, kafka` — but `pipeline_compiler.py`'s `_compile_source` only
implements `iceberg_table`; every other type raises
`CompileError(f"Source type '{node.type}' is not yet supported by the
compiler")`.

## Hands-On Walkthrough — prove the unsupported types fail loudly (not silently)

1. Create pipeline `source_types_demo`. Add a source node, set
   `type = csv` (select it from the palette even though you know it's
   listed as a source type), leave config empty.
2. Click **Compile**. **Expected result**: a compile error referencing
   "Source type 'csv' is not yet supported by the compiler" — this is the
   correct, safe failure mode (loud and immediate), not a silent no-op.
3. Change the node's `type` back to `iceberg_table`, `schema = bronze`,
   `table = olist_products`. Compile again. **Expected result**: succeeds,
   `SELECT * FROM iceberg.bronze.olist_products`.

## Destination types: 3 real, 2 UI-only

**Verified from `_DESTINATION_SCHEMA`**: only `iceberg_bronze` (→`bronze`
schema), `iceberg_silver` (→`silver`), `iceberg_gold` (→`gold`) are
implemented. `minio` and `kafka` destination types are palette-visible but
raise the same `CompileError` pattern.

4. On the same pipeline, add a destination node `type = minio`,
   `table = whatever`. Compile. **Expected result**: "Destination type
   'minio' is not yet supported by the compiler".
5. Change it to `type = iceberg_gold`, `table = products_demo`. Compile,
   run. **Expected result**: succeeds;
   `SELECT count(*) FROM iceberg.gold.products_demo` in SQL Editor returns
   `32951`.

## Why this matters for how you plan a real pipeline

Always check a node's real support status before designing around it —
the UI intentionally shows the platform's full *specified* palette
(matching `OPENLAKEHOUSE_SPEC.md`) even for types not yet wired to real
execution, so you can see the target design, not just what's done. This
project's docs flag every gap explicitly rather than let you discover it
via a surprise error mid-build.

> 🧪 **Checkpoint**: you triggered 2 real compile errors for unsupported
> types and confirmed the 2 real supported types (`iceberg_table` source,
> `iceberg_gold` destination) both work end-to-end.

## Next document

[`03-transformations.md`](03-transformations.md).
