# 05 — Project Scope

**Content type: PROJECT IMPLEMENTATION.**

## Purpose

Draw an explicit boundary around what this project builds, so later
documents don't silently expand scope by inventing platform features.

## In scope

- Full Bronze/Silver/Gold pipeline for all 9 Olist source files.
- Complete Kimball star schema with two true SCD Type 2 dimensions.
- Both Pipeline-Builder-based and dbt-based Gold transformations
  (deliberately using both tools, since the platform supports both and a
  real team would pick per-transformation based on fit — see
  `01-architecture/09-architecture-decisions.md` ADR-006).
- One end-to-end orchestrated pipeline mixing basic and advanced node
  kinds (including a real `dbt` node), scheduled via Dagster.
- A 6-dashboard BI suite in Superset.
- One registered, evaluated MLflow model (late-delivery prediction).
- At least one streaming and one CDC exercise, applied to Olist-shaped data.
- Version control of all project artifacts in Gitea.
- A documented test matrix, a documented set of production incident
  simulations, and a documented security/RBAC verification.
- This entire documentation repository.

## Out of scope (and why)

| Item | Why out of scope |
|---|---|
| New Pipeline Builder node kinds/destinations | Would require platform code changes beyond "build the Olist project" — documented as proposed extensions where relevant, not delivered. |
| Per-table/row-level RBAC | Not implemented in the platform today; documented as a proposed extension in `16-security/`. |
| Multi-node Spark/Trino cluster scaling | Out of scope for a single-host dev deployment; discussed conceptually in `08-advanced-data-engineering/08-performance-optimization.md` as "what would need to change," not built. |
| Kubernetes deployment | The platform's real deployment unit is Docker Compose; not part of this project. |
| Adding `dbt snapshot` support to the pipeline node kind | A real, contained, documented extension exercise (see `06-dbt/08-snapshots.md`) — explicitly optional, not required for capstone completion. |
| Building a brand-new BI tool, ML platform, or catalog | Superset/MLflow/OpenMetadata already exist and are used as-is. |

## Assumptions

- The reader has Docker Desktop, ~32GB RAM, and the OpenLakehouse repo
  already checked out and buildable (`docker compose --profile full up -d
  --build`).
- The reader has independently obtained the 9 Kaggle Olist CSVs (this
  project does not redistribute the dataset).
- "Production" in this repository's security/performance/DR discussions
  means "as if this dev deployment had to serve real, ongoing business
  traffic" — a thought exercise grounded in this platform's real
  architecture, not a claim that this exact Docker Compose stack is
  production-hardened as shipped.

## Constraints

- No platform source code is modified by *this* documentation project by
  default — where a document proposes an extension (e.g. `dbt snapshot`
  node support), it is explicitly marked optional/proposed, consistent
  with `GAP_ANALYSIS.md` §5.
- All SQL/config examples must use real, verified syntax for this stack's
  actual versions (Trino, dbt-trino 1.10.3, Iceberg REST catalog via
  Polaris) — no generic "any SQL engine" hand-waving.

## Next document

[`06-prerequisites.md`](06-prerequisites.md).
