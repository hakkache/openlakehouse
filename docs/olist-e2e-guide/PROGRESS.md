# Guide Build Progress

**Status: COMPLETE — all 21 modules restructured into FIFA-depth, multi-document folders (modules 01-20 as folders with `00-index.md` + focused content docs; module 21 kept as a single flat reference file by design). See table below for per-module doc counts.

| # | Module | Folder | Docs |
|---|---|---|---|
| 01 | Platform Architecture | `01-platform-architecture/` | 4 |
| 02 | Environment Setup & First Login | `02-environment-setup-and-first-login/` | 4 |
| 03 | Data Model & Source Analysis | `03-data-model-and-source-analysis/` | 4 |
| 04 | Bronze Ingestion | `04-bronze-ingestion/` | 4 |
| 05 | Silver Transformation | `05-silver-transformation/` | 5 |
| 06 | Pipeline Builder Deep Dive | `06-pipeline-builder-deep-dive/` | 16 |
| 07 | dbt Modeling | `07-dbt-modeling/` | 6 |
| 08 | Dimensional Modeling & SCD2 | `08-dimensional-modeling-and-scd2/` | 7 |
| 09 | Orchestration (Dagster) | `09-orchestration-dagster/` | 4 |
| 10 | Data Quality & Testing | `10-data-quality-and-testing/` | 4 |
| 11 | Lineage & Governance | `11-lineage-and-governance/` | 4 |
| 12 | BI/Analytics (Superset) | `12-bi-analytics-superset/` | 5 |
| 13 | Machine Learning (MLflow) | `13-machine-learning-mlflow/` | 5 |
| 14 | Streaming/Kafka/CDC | `14-streaming-kafka-cdc/` | 5 |
| 15 | Observability & Monitoring | `15-observability-monitoring/` | 5 |
| 16 | Security/Keycloak/RBAC | `16-security-keycloak-rbac/` | 4 |
| 17 | Gitea Version Control & CI/CD | `17-gitea-version-control-cicd/` | 4 |
| 18 | Platform Ops: Connections & Compute | `18-platform-operations-workspace-compute/` | 4 |
| 19 | AI Assistant | `19-ai-assistant/` | 3 |
| 20 | Production Incidents & Capstone | `20-production-incidents-and-capstone/` | 4 |
| 21 | Reference Cheatsheet | `21-reference-cheatsheet.md` (flat, by design) | 1 |

Cross-link cleanup: fixed stale link in module 06 doc 15 (now points to `../07-dbt-modeling/00-index.md`); `00-README.md` folder map rewritten to link every module's `00-index.md`.

