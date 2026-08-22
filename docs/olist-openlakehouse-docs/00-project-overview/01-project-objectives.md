# 01 — Project Objectives

**Content type: PROJECT IMPLEMENTATION** (this document describes what the
Olist project sets out to build; it does not claim any of it is pre-built).

## Purpose

Define, in concrete and testable terms, what "done" means for the Olist
Brazilian E-Commerce lakehouse project, so every later document (from
Bronze ingestion to the capstone) can be evaluated against a fixed target
instead of a vague "make a data platform" goal.

## Prerequisites

None — this is the entry document.

## The objective, stated as an engineering contract

Build, on top of the existing OpenLakehouse platform, a Kimball-style
dimensional data warehouse over the real Kaggle "Brazilian E-Commerce
Public Dataset by Olist," such that:

1. **Every raw fact in the 9 source CSVs is traceable** to a Gold-layer row
   through a documented, re-runnable pipeline (no hand-edited tables).
2. **The star schema answers real business questions** (see
   [`02-business-context.md`](02-business-context.md)) with SQL that a BI
   tool can run directly against `gold.*` — no post-processing in a
   notebook required for a business user to get an answer.
3. **Slowly Changing history is real**, not simulated after the fact:
   `dim_customers` and `dim_sellers` are true SCD Type 2 tables that can
   correctly answer "what was true when this order was placed."
4. **The pipeline is testable and observable**: every quality rule, every
   dbt test, every pipeline run status is inspectable through the
   platform's real UI/API surfaces — not just "it ran, trust me."
5. **Failure is a designed-for first-class case**, not an afterthought:
   duplicate records, late data, schema drift, and pipeline failures all
   have a documented detection → diagnosis → recovery path, and are
   exercised on purpose at least once (see `21-production-scenarios/`).
6. **The project can be defended in an architecture review**: every major
   design choice (Iceberg vs. plain Parquet, two fact tables vs. one, dbt
   vs. Pipeline Builder, batch vs. streaming) has a written rationale (see
   `01-architecture/09-architecture-decisions.md`).

## Success criteria (checked in the capstone, `22-capstone/`)

| # | Criterion | Verified by |
|---|---|---|
| 1 | 9 real Bronze Iceberg tables, correct row counts | `03-bronze-ingestion/08-bronze-testing.md` |
| 2 | Typed, deduplicated, quality-gated Silver tables | `04-silver-transformation/10-silver-testing.md` |
| 3 | Real, working SCD2 `dim_customers`/`dim_sellers` | `07-dimensional-modeling/11-scd2-testing.md` |
| 4 | Two correctly-joined, correctly-grained fact tables | `10-data-quality/04-referential-integrity.md` |
| 5 | dbt project with tests, runnable from both `/dbt` page and pipeline node | `06-dbt/07-tests.md` |
| 6 | At least one mixed basic+advanced, dbt-integrated orchestrated pipeline, scheduled via Dagster | `05-pipeline-builder/14-fourteen-pipeline-scenarios.md`, `09-orchestration/` |
| 7 | Unbroken lineage graph, Bronze → Gold | `11-lineage-and-governance/01-lineage.md` |
| 8 | 6-dashboard BI suite with defined metrics | `12-bi-and-analytics/` |
| 9 | A registered, evaluated MLflow model | `13-machine-learning/` |
| 10 | At least one exercised streaming/CDC scenario | `14-streaming-and-cdc/` |
| 11 | A completed, ID'd test matrix | `20-testing/04-full-test-matrix.md` |
| 12 | At least 5 production incidents simulated and resolved | `21-production-scenarios/` |

## Non-goals

- This project does **not** attempt to add platform features that don't
  exist (new node kinds, new RBAC granularity, new destinations) as part of
  its "done" bar — those are documented as proposed extensions where
  relevant, not required deliverables.
- This project does not require a production Kubernetes deployment — the
  existing Docker Compose profiles are the target deployment shape (see
  `01-architecture/08-deployment-architecture.md`).

## Next document

[`02-business-context.md`](02-business-context.md) — why an e-commerce
company would build this in the first place.
