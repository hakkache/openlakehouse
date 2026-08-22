# OpenLakehouse — Olist End-to-End Guided Project

This is a hands-on, follow-along guide to build, test, and operate a
complete lakehouse data platform project — the Brazilian **Olist**
e-commerce dataset — on top of the real, running **OpenLakehouse**
platform in this repository.

Every document below is written to be **executed**, not just read: exact
URLs, exact clicks, exact copy-pasteable SQL/code, and the exact result
you should see. Scenarios progress **simple → advanced → complex** within
every document, so you build real muscle memory with each functionality
before combining them.

## Content labeling (used throughout)

- **CURRENT PLATFORM CAPABILITY** — a real, verified feature of
  OpenLakehouse today (verified against the actual backend source code in
  `backend/app/`, `infra/`).
- **PROJECT WORK** — something *you* build for the Olist project using
  that real capability (a pipeline, a dbt model, a dashboard).
- **PROPOSED EXTENSION** — explicitly flagged as *not* implemented today;
  a legitimate next step, never presented as if it already works.

## Prerequisites

1. The stack is running: `docker compose --profile full up -d --build`
   from the repo root.
2. Confirm core services are healthy: `docker compose ps` — `backend`,
   `frontend`/`traefik`, `postgres`, `trino`, `spark-master`,
   `spark-worker`, `polaris`, `minio`, `keycloak` should all show
   `running`/`healthy`.
3. Olist raw CSVs are present under `docs/guided_project/` (or wherever
   your copy lives) — `fifa_world_cup_2026_player_performance.csv` and
   `sample_orders.csv` are the small samples already in this repo;
   the full Olist Kaggle CSVs (9 files) are assumed available for the
   deeper exercises — if you don't have them, note it and use the sample
   files, scaling row-count expectations down accordingly.
4. You have a browser open to `http://localhost` and a terminal at the
   repo root.

## Folder map (read in this order)

Every module below is now a **folder** of focused documents (each with
diagrams, config tables, numbered scenarios of increasing complexity,
negative tests, and a 🧪 Checkpoint) — start at each module's `00-index.md`.
Module 21 remains a single flat reference file by design (a cheatsheet
doesn't benefit from splitting).

| # | Module folder | Covers |
|---|---|---|
| 01 | [`01-platform-architecture/00-index.md`](01-platform-architecture/00-index.md) | System diagrams, service map, medallion architecture |
| 02 | [`02-environment-setup-and-first-login/00-index.md`](02-environment-setup-and-first-login/00-index.md) | Boot the stack, Keycloak login, roles, first tour |
| 03 | [`03-data-model-and-source-analysis/00-index.md`](03-data-model-and-source-analysis/00-index.md) | Olist schema ERD, profiling the raw data, data quirks |
| 04 | [`04-bronze-ingestion/00-index.md`](04-bronze-ingestion/00-index.md) | Jupyter/Spark raw ingestion into Iceberg Bronze |
| 05 | [`05-silver-transformation/00-index.md`](05-silver-transformation/00-index.md) | Pipeline Builder basics: clean, type, dedupe, quality-gate |
| 06 | [`06-pipeline-builder-deep-dive/00-index.md`](06-pipeline-builder-deep-dive/00-index.md) | Every real node type, simple → complex pipelines (16 docs) |
| 07 | [`07-dbt-modeling/00-index.md`](07-dbt-modeling/00-index.md) | dbt sources, staging, marts, tests, snapshots, incremental |
| 08 | [`08-dimensional-modeling-and-scd2/00-index.md`](08-dimensional-modeling-and-scd2/00-index.md) | Star schema, SCD Type 1/2, temporal joins, the MERGE bug |
| 09 | [`09-orchestration-dagster/00-index.md`](09-orchestration-dagster/00-index.md) | Real Dagster scheduling, manual runs, multi-stage workaround |
| 10 | [`10-data-quality-and-testing/00-index.md`](10-data-quality-and-testing/00-index.md) | Quality gates, referential integrity, negative testing |
| 11 | [`11-lineage-and-governance/00-index.md`](11-lineage-and-governance/00-index.md) | Real pipeline-derived lineage graph, impact analysis |
| 12 | [`12-bi-analytics-superset/00-index.md`](12-bi-analytics-superset/00-index.md) | Superset datasets, dashboards, cross-filtering |
| 13 | [`13-machine-learning-mlflow/00-index.md`](13-machine-learning-mlflow/00-index.md) | Late-delivery model, MLflow tracking/registry |
| 14 | [`14-streaming-kafka-cdc/00-index.md`](14-streaming-kafka-cdc/00-index.md) | Kafka, Spark Structured Streaming, Debezium CDC |
| 15 | [`15-observability-monitoring/00-index.md`](15-observability-monitoring/00-index.md) | Prometheus, Loki, Grafana, OTel, incident response |
| 16 | [`16-security-keycloak-rbac/00-index.md`](16-security-keycloak-rbac/00-index.md) | Authentication, RBAC, secrets encryption |
| 17 | [`17-gitea-version-control-cicd/00-index.md`](17-gitea-version-control-cicd/00-index.md) | Git workflow, Gitea, CI |
| 18 | [`18-platform-operations-workspace-compute/00-index.md`](18-platform-operations-workspace-compute/00-index.md) | Connections, Compute page |
| 19 | [`19-ai-assistant/00-index.md`](19-ai-assistant/00-index.md) | The local Ollama-backed assistant, capabilities and gaps |
| 20 | [`20-production-incidents-and-capstone/00-index.md`](20-production-incidents-and-capstone/00-index.md) | Full incident drills + final integration capstone |
| 21 | [`21-reference-cheatsheet.md`](21-reference-cheatsheet.md) | Commands, SQL patterns, troubleshooting, glossary |

## How to use this guide

Work top to bottom. Each document ends with a **🧪 Checkpoint** — do not
move on until you've genuinely reproduced it in your own environment.
Every SQL/API example uses **real** table names and row counts from the
Olist dataset as ingested in this guide — if your own numbers differ,
that's a signal to double check your ingestion step, not a documentation
error.

## Progress tracker

See [`PROGRESS.md`](PROGRESS.md).
