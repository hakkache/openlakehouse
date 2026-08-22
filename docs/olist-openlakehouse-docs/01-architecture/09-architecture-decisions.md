# 09 — Architecture Decision Records

**Content type: PROJECT IMPLEMENTATION** (decisions made *for this Olist
project*, grounded in **CURRENT PLATFORM CAPABILITY** at decision time).

## Purpose

Record the "why," not just the "what," for the 14 most consequential
architecture choices in this project, in standard ADR format
(Context → Decision → Alternatives Considered → Consequences).

---

## ADR-001: Use Apache Iceberg as the table format

**Context**: Need a table format that supports ACID writes, schema
evolution, and time travel over object storage (MinIO), usable from both
Spark and Trino against one shared catalog.
**Decision**: Apache Iceberg via the Polaris REST catalog.
**Alternatives considered**: Hive-style external tables (no ACID/schema
evolution), Delta Lake (weaker native Trino support at the time of
platform design vs. Iceberg's first-class `iceberg` Trino connector).
**Consequences**: Gained snapshot time-travel and safe overwrite/merge
semantics (used throughout `21-production-scenarios/`); accepted the
operational cost of running a REST catalog (Polaris) as an extra service.

## ADR-002: Bronze/Silver/Gold medallion layering, with joins deferred to Gold

**Context**: Need a layering convention balancing raw-fidelity auditability
against query-ready usability.
**Decision**: Three layers; Silver stays single-source-table grain, all
joins happen at Gold (see `01-architecture/02-logical-architecture.md`).
**Alternatives considered**: Joining earlier ("wide Silver") — rejected
because it couples every consuming Gold model to Silver's join logic and
makes Silver-level testing depend on other tables.
**Consequences**: More total pipelines (one per Silver table, plus Gold
join pipelines) but each is independently testable.

## ADR-003: Kimball dimensional modeling (star schema) for Gold, not Data Vault

**Context**: Need Gold to answer repeat business questions efficiently and
be BI-tool-friendly.
**Decision**: Kimball star schema — conformed dimensions
(`dim_customers`, `dim_sellers`, `dim_products`, `dim_date`) shared across
fact tables.
**Alternatives considered**: Data Vault (better raw auditability/parallel
loading, but adds hub/link/satellite modeling overhead not justified by
this project's team-of-one scale and BI-first goal).
**Consequences**: Straightforward Superset dataset modeling; requires
disciplined SCD2 handling for historically-accurate joins (see ADR-005).

## ADR-004: Two fact tables (`fact_orders`, `fact_order_items`) instead of one

**Context**: Olist's natural grain has both an order-level concept (one
row per order, e.g. for order-count/status metrics) and an order-item
grain (one row per line item, needed for revenue/category-level analysis,
since `product_id`/`seller_id`/price are per-item).
**Decision**: Two fact tables at two grains, both referencing shared
dimensions.
**Alternatives considered**: One fact at item grain only, deriving
order-level counts via `COUNT(DISTINCT order_id)` — rejected because it
makes simple order-count metrics require careful distinct-counting
discipline in every downstream BI query, a common source of double-
counting bugs.
**Consequences**: Slightly more ETL, but each fact table's grain is
unambiguous and additive measures are safe to `SUM()` directly (see
`02-source-and-data-model/08-business-metrics.md`).

## ADR-005: True SCD Type 2 for `dim_customers` and `dim_sellers`

**Context**: Business questions (`02-business-context.md`) require
historically-accurate geography-over-time, not just "current" attributes.
**Decision**: Full SCD2 (`effective_date`/`end_date`/`is_current`
surrogate-keyed dimensions), built two ways for teaching purposes: manual
`MERGE INTO` and dbt's native `snapshot` feature.
**Alternatives considered**: SCD Type 1 (overwrite) — rejected, it's
exactly the bug class in `02-business-context.md`'s second cautionary
example. SCD Type 3 (limited "previous value" column) — rejected, doesn't
support arbitrary-time-point historical joins.
**Consequences**: The single largest engineering investment in this
project — see the entire `07-dimensional-modeling/` module.

## ADR-006: Use both the No-Code Pipeline Builder and dbt (not just one)

**Context**: The platform offers two real, independent transformation
tools with overlapping capability.
**Decision**: Use the Pipeline Builder for Bronze→Silver (simple,
visual, good for onboarding/audit) and dbt for Silver→Gold marts (better
suited to complex joins/tests/documentation-as-code at that layer);
document both paths for Gold since the platform genuinely supports either.
**Alternatives considered**: dbt-only (loses the Pipeline Builder's visual
lineage/quality-gate integration for Silver); Pipeline-Builder-only for
everything (loses dbt's test framework and SQL-native modeling ergonomics
for complex Gold joins).
**Consequences**: Two tools to teach, but each used where it's strongest;
documented explicitly in `06-dbt/` and `05-pipeline-builder/`.

## ADR-007: Trino for interactive/BI query, Spark for ingestion/heavy batch

**Context**: Need both fast interactive SQL and flexible programmatic
ingestion (reading CSVs, complex Python logic).
**Decision**: Spark (via Jupyter/spark-submit) owns ingestion and any
PySpark-authored transform; Trino owns interactive SQL Editor queries,
Superset, and dbt-trino.
**Consequences**: Two engines against one Iceberg catalog (ADR-001) means
catalog-alias discipline matters (`catalog.` vs `iceberg.` — see
`01-architecture/01-platform-architecture.md`).

## ADR-008: Batch-first, with dedicated (not primary) streaming/CDC exercises

**Context**: Olist's dataset is inherently a historical batch export; there
is no live production order stream to consume by default.
**Decision**: Build the main project batch-first; treat streaming
(`streaming_orders.py`) and CDC (`cdc_sync.py`) as deliberately separate,
smaller exercises simulating "what if this were live."
**Consequences**: Keeps the core project's learning curve manageable while
still covering streaming/CDC as real, working exercises (`14-streaming-and-cdc/`).

## ADR-009: Kafka + Debezium for the CDC exercise

**Context**: Need a realistic CDC source for the streaming/CDC module.
**Decision**: Debezium's Postgres connector capturing changes into Kafka,
consumed by a Spark batch `MERGE INTO` job.
**Consequences**: Inherited the real dedup-before-merge requirement
(multiple events per key within one micro-batch) — a genuine, previously-
encountered correctness bug class, documented as a first-class lesson in
`14-streaming-and-cdc/04-debezium-cdc.md`.

## ADR-010: Dagster for orchestration (not Airflow)

**Context**: Need a scheduler for the platform's saved pipelines.
**Decision**: Dagster, with a real cron schedule
(`all_pipelines_schedule`, `*/15 * * * *`) that runs the most-recently-
updated saved pipeline.
**Consequences**: Simple, works today; the "most-recently-updated pipeline"
selection strategy is a real, current simplification worth knowing before
assuming per-pipeline independent schedules exist (they don't, today) —
see `09-orchestration/`.

## ADR-011: Superset for BI (not a custom dashboard build)

**Context**: Need dashboards over Gold without building a bespoke frontend
charting system.
**Decision**: Superset, connected to Trino, datasets over `gold.*`.
**Consequences**: Fast to stand up 6 dashboards; Superset's own RBAC is
separate from OpenLakehouse's Keycloak-based RBAC (two independent auth
systems) — a real integration seam worth knowing about.

## ADR-012: MLflow for experiment tracking/model registry

**Context**: Need reproducible ML experiment tracking for the
late-delivery-prediction model.
**Decision**: MLflow, MinIO-backed artifact store, no-auth (dev-only)
tracking server.
**Consequences**: Real registry/versioning gained; no-auth access is
explicitly dev-only and would need addressing before any real deployment
(cross-reference `01-architecture/07-security-architecture.md`).

## ADR-013: Gitea for version control (not GitHub-hosted for this project)

**Context**: Need a self-hosted git remote for pipeline JSON exports and
the dbt project, without depending on external SaaS during local
development.
**Decision**: Gitea, self-hosted in-stack.
**Consequences**: Fully offline-capable version control workflow; no CI
runners configured by default (see ADR on deployment, `08-deployment-
architecture.md`).

## ADR-014: Grafana/Loki/Prometheus for observability (not a SaaS APM)

**Context**: Need metrics/logs/traces without external SaaS dependency or
cost.
**Decision**: Prometheus (metrics, 12 real scrape targets) + Loki/Promtail
(logs) + Grafana (dashboards) + OTel collector (traces) — all self-hosted.
**Consequences**: Full observability stack included in the base
deployment; Dagster specifically is not Prometheus-scraped (logs-only via
Loki) — a real, accepted gap, not an oversight (see
`15-observability/02-metrics-and-dashboards.md`).

---

## Back to top-level

[`01-platform-architecture.md`](01-platform-architecture.md) ·
[Repository README](../README.md)
