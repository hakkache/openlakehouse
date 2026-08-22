# Glossary

**Content type: REFERENCE.**

- **Bronze/Silver/Gold** — the medallion architecture's 3 real Iceberg
  schemas in this project: raw preserved data, cleaned/typed data, and
  dimensionally-modeled business data, respectively.
- **CDC (Change Data Capture)** — Debezium capturing real row-level
  Postgres changes (insert/update/delete) as a Kafka event stream.
- **SCD2 (Slowly Changing Dimension, Type 2)** — a dimension design
  preserving full history via `valid_from`/`valid_to`/`is_current`
  columns, rather than overwriting (Type 1).
- **Surrogate key** — a synthetic, stable key (e.g.
  `row_number()`-generated) used instead of a natural/business key for
  dimension joins.
- **Role-playing dimension** — one dimension table (e.g. `dim_date`)
  joined multiple times in one fact table for different roles (purchase
  date vs. delivery date).
- **Fail-fast (Pipeline Executor)** — the real behavior where any node
  failure skips all remaining nodes in that run, verified in
  `pipeline_executor.py`.
- **Compiled SQL mode** vs **advanced mode** — the two real Pipeline
  Builder execution engines: a single compiled `WITH` CTE statement vs. a
  step-by-step executor materializing real Trino views.
- **Leakage (ML)** — using a feature that's only knowable *after* the
  event you're trying to predict, producing an artificially
  high-performing but useless model.
- **Idempotency** — re-running the same operation with the same input
  produces the same result, with no unintended side effects (verified via
  MERGE-based upserts in this project).
- **Partition pruning** — Trino/Iceberg skipping entire files/partitions
  that can't match a query's filter, reducing scanned bytes.
- **Lineage (this project's real implementation)** — a table-level
  source→destination graph derived statically from saved Pipeline
  Builder definitions, not a runtime data-flow trace.

## Next reference document

[`faq.md`](faq.md).
