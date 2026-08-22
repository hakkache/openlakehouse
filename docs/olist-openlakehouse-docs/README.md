# OpenLakehouse — Olist E-Commerce Lakehouse: Complete Documentation Repository

> A professional, multi-document technical knowledge base for the Olist
> Brazilian E-Commerce data platform built on OpenLakehouse. This
> repository is the deep-dive successor to the single-file
> [`docs/OLIST_END_TO_END_GUIDE.md`](../OLIST_END_TO_END_GUIDE.md) — that
> document remains available as a fast, linear walkthrough; **this**
> repository is the reference library: architecture, data modeling,
> engineering practice, testing, security, operations, and a full
> production-incident/interview-defense library, split into focused
> documents you can navigate independently.

This is a **living, incrementally-built** repository — see
[`PROGRESS.md`](PROGRESS.md) for what's written so far and what's queued
next. [`GAP_ANALYSIS.md`](GAP_ANALYSIS.md) and [`MASTER_PLAN.md`](MASTER_PLAN.md)
document why it's structured this way and exactly how every chapter of the
original guide maps into it.

## Content classification — read this first

Every document in this repository tags its claims with one of three labels.
This is a hard rule, not a suggestion — OpenLakehouse's real implementation
has specific, verified boundaries, and this documentation must never blur
them:

- **CURRENT PLATFORM CAPABILITY** — a feature that exists today, in the
  actual OpenLakehouse codebase, verified by direct testing (API calls,
  pytest, live browser sessions). If a document says "the Pipeline Builder
  has an `iceberg_table` source node," that's this category.
- **PROJECT IMPLEMENTATION** — something *you* build for the Olist project
  using current platform capability (e.g. "we design a `dim_customers` SCD2
  table using a dbt snapshot"). This is project-specific work product, not a
  platform feature.
- **PROPOSED / FUTURE EXTENSION** — a capability that does **not** exist
  today and would require real code changes to the platform (e.g. adding a
  `snapshot` command to the `dbt` pipeline node kind, or per-table row-level
  RBAC). Always explicitly labeled as proposed — never presented as if it
  already works.

## Learning paths

Pick a path based on your goal — every path is a curated subset of the full
document tree, in read order.

### Beginner path
1. [`00-project-overview/01-project-objectives.md`](00-project-overview/01-project-objectives.md)
2. [`01-architecture/01-platform-architecture.md`](01-architecture/01-platform-architecture.md)
3. `03-bronze-ingestion/` (all)
4. `04-silver-transformation/` (all)
5. `07-dimensional-modeling/01-08` (dimension/fact fundamentals)
6. `12-bi-and-analytics/` (all)

### Data Engineer path
`03-bronze-ingestion/` → `04-silver-transformation/` → `05-pipeline-builder/`
→ `06-dbt/` → `07-dimensional-modeling/` → `09-orchestration/` →
`20-testing/`

### Advanced Data Engineer path
`08-advanced-data-engineering/` → `07-dimensional-modeling/08-15` (full
SCD2) → `14-streaming-and-cdc/` → `15-observability/` →
`21-production-scenarios/`

### Data Architect path
`01-architecture/` (all, incl. ADRs) → `02-source-and-data-model/` →
`07-dimensional-modeling/` → `16-security/` → `18-platform-operations/`

### ML Engineer path
`02-source-and-data-model/` → `07-dimensional-modeling/` →
`13-machine-learning/` (all)

### Reference / on-call path
`23-reference/troubleshooting.md` → `23-reference/commands.md` →
`21-production-scenarios/` → `15-observability/06-incident-response.md`

## Full directory map

See [`MASTER_PLAN.md`](MASTER_PLAN.md) §1 for the complete, authoritative
directory tree with every planned document, and §2 for the exact mapping
from each chapter of the original 24-chapter guide into this structure.

## Conventions used throughout this repository

- **Table names**: `bronze.olist_*` (raw), `silver.*` (typed/deduped/
  quality-gated), `gold.dim_*`/`gold.fact_*` (Pipeline-Builder-built star
  schema) or `dbt`-managed marts under the dbt project's own configured
  schema — a document will say explicitly which tool built a given table.
- **Engine catalog aliases**: Spark's Iceberg catalog is `catalog`; Trino's
  is `iceberg`. Same underlying Polaris warehouse, two per-engine local
  names — every SQL example uses the engine-correct alias.
- **Access**: the app is always reached via Traefik at `http://localhost`
  (port 80). Admin UIs for Dagster/Superset/MLflow/Gitea/Grafana/
  OpenMetadata are reachable directly on their own ports (not Traefik-routed
  — this is a real, current platform limitation, not an oversight).
- **Credentials**: default dev credentials from `docker-compose.yml` are
  used throughout (e.g. `admin.user`/`openlakehouse` via Keycloak,
  Superset `admin`/`openlakehouse_dev_password`) — see
  [`00-project-overview/06-prerequisites.md`](00-project-overview/06-prerequisites.md)
  for the full access matrix.
- **Mermaid diagrams** are used for architecture/ERD/flow diagrams
  throughout for consistency and easy re-rendering.
