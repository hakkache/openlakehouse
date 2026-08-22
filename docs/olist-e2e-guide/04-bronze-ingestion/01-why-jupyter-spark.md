# 01 — Why Bronze Ingestion Uses Jupyter/Spark, Not Pipeline Builder

Pipeline Builder's real compiled **source** node types (`SOURCE_TYPES` in
`backend/app/schemas/pipeline.py`) only compile `iceberg_table` —
`csv`/`json`/`parquet` source types exist in the UI but raise a real
`CompileError` if you try to run them (proven in module 06, doc 02).
Raw-file ingestion therefore genuinely requires Spark directly (via
Jupyter), the same way a real lakehouse's initial "land the files" step
usually does — Pipeline Builder is a **transformation** tool operating on
tables that already exist in the catalog, not a file-loading tool.

## Comparison table — which tool does what

| Task | Right tool | Why |
|---|---|---|
| Load a raw CSV file into the catalog | Jupyter/Spark | only real path — Pipeline Builder's file sources aren't compiled |
| Transform an existing Iceberg table | Pipeline Builder | its one real source type is `iceberg_table` |
| Ad-hoc exploratory analysis of a raw file before deciding how to model it | Jupyter/pandas | fastest iteration loop |
| Scheduled, repeatable transformation | Pipeline Builder (+ Dagster schedule) | has a real scheduling story; a Jupyter notebook does not |

## Next document

[`02-ingesting-all-9-tables.md`](02-ingesting-all-9-tables.md).
