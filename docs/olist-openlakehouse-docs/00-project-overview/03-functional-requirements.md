# 03 — Functional Requirements

**Content type: PROJECT IMPLEMENTATION**, built strictly from **CURRENT
PLATFORM CAPABILITY** (every requirement below maps to a real, verified
OpenLakehouse feature — none require unbuilt platform functionality).

## Purpose

Enumerate concrete, testable functional requirements for the Olist
lakehouse project, each traced to the platform capability that satisfies it.

## FR-1 — Raw data ingestion

The system shall load all 9 Olist source CSVs into real Iceberg tables
under `bronze.olist_*`, preserving raw values (only light type inference,
no business logic), via a Jupyter + PySpark notebook — the only ingestion
path into this platform, since the Pipeline Builder's only source type is
`iceberg_table` (it cannot read a raw CSV directly). See
`03-bronze-ingestion/`.

## FR-2 — Silver-layer cleaning and quality gating

The system shall produce one Silver table per Bronze source table that
needs typing/cleaning, built via the No-Code Pipeline Builder using its
real node types: `iceberg_table` source, `cast`/`deduplicate`/`join`/
`fill_null` transforms, `not_null`/`unique`/`regex` quality gates, and
`iceberg_silver` destination. A quality-gate failure shall block the write
(this is real platform behavior, not a proposal — quality nodes actually
gate downstream destination nodes today). See `04-silver-transformation/`.

## FR-3 — Gold-layer dimensional model

The system shall build a Kimball star schema at Gold: `dim_customers`,
`dim_sellers` (both true SCD Type 2), `dim_products`, `dim_date`, and two
fact tables (`fact_orders` order-grain, `fact_order_items` order-item
grain), using **either** the Pipeline Builder's `iceberg_gold` destination
**or** dbt marts models — both are current, real, valid tools for this
layer. See `07-dimensional-modeling/` and `06-dbt/`.

## FR-4 — dbt-based transformation and testing

The system shall maintain a dbt project (staging/intermediate/marts models
over the Silver sources) runnable two ways, both real and verified: (a)
the `/dbt` UI page's Run panel, and (b) a `dbt` pipeline-node
(`run`/`test`/`build` only — `snapshot` is not a supported node command
today, see `06-dbt/08-snapshots.md`). Both entry points persist to the same
`dbt_runs` history table. See `06-dbt/`.

## FR-5 — Orchestration

The system shall have at least one saved pipeline picked up by Dagster's
real `all_pipelines_schedule` (cron `*/15 * * * *`, picks the
most-recently-updated saved pipeline — this is genuinely how the scheduler
works today, not a simplification) and confirm a scheduled run appears in
both the Jobs page and the pipeline's own run history. See
`09-orchestration/`.

## FR-6 — Data quality and lineage visibility

Every quality-node result across every saved pipeline shall be visible in
the real Data Quality dashboard (`/quality`), and every source→destination
edge across saved pipelines shall be visible in the real Lineage graph
(`/lineage`) — both are genuine, already-implemented aggregations over
stored pipeline definitions and run history, not mockups. See
`10-data-quality/` and `11-lineage-and-governance/`.

## FR-7 — BI dashboards

The system shall expose Gold-layer tables through Superset (a real,
already-integrated Trino connection) with at least 6 dashboards addressing
the business questions in `02-business-context.md`. See
`12-bi-and-analytics/`.

## FR-8 — Machine learning

The system shall train, log, and register (via the real MLflow integration)
at least one model predicting late-delivery risk, using only Gold-layer
features available at order-placement time (no leakage). See
`13-machine-learning/`.

## FR-9 — Streaming/CDC exercise

The system shall exercise at least one real streaming path (Kafka →
Spark Structured Streaming → Bronze, using the platform's real
`streaming_orders.py` reference job) and/or one CDC path (Debezium →
Kafka → Spark batch `MERGE INTO` → Bronze, using the platform's real
`cdc_sync.py` pattern), applied conceptually to Olist-shaped "day 2" change
data. See `14-streaming-and-cdc/`.

## FR-10 — Version control

The system shall have its dbt project files and exported pipeline JSON
definitions committed to a real Gitea repository. See
`17-devops-and-version-control/`.

## FR-11 — Observability

The system's pipeline runs, dbt runs, and platform component health shall
be observable through the real Prometheus/Grafana/Loki stack already
deployed by the platform (not a new observability integration — this
project *uses* Phase 17's existing exporters/dashboards). See
`15-observability/`.

## FR-12 — Security review

The project shall include at least one verified RBAC test (e.g. confirming
`engineer.user`, a non-`ADMIN` role, is correctly blocked from
`/admin` and from running a `python`/`pyspark` pipeline code node) against
the platform's real, narrow RBAC surface — see
`16-security/03-authorization-and-rbac.md` for exactly what is and isn't
actually gated today.

## Explicitly out of scope (current platform gap, not a requirement gap)

- Writing a pipeline `destination` to `minio`/`postgresql`/`kafka`, or a
  `quality` node of type `schema` — these are UI-selectable but not
  implemented in the compiler (`CompileError` at run time). Any Silver/Gold
  destination in this project uses `iceberg_silver`/`iceberg_gold` only.
- A `dbt` pipeline node running `dbt snapshot` — use a direct
  `docker compose exec dbt dbt snapshot` command instead, or treat adding
  `snapshot` support as a proposed extension (`06-dbt/08-snapshots.md`).

## Next document

[`04-non-functional-requirements.md`](04-non-functional-requirements.md).
