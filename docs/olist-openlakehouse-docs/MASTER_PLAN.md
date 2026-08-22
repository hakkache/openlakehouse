# Documentation Master Plan

> Phase 2 deliverable. This is the authoritative file structure for the new
> multi-document repository at `docs/olist-openlakehouse-docs/`, and the
> mapping from the original 24-chapter guide into it. Track build progress
> in [`PROGRESS.md`](PROGRESS.md).

## 1. Directory structure (adapted to what OpenLakehouse actually implements)

The example structure in the request is followed closely. A few folders from
the example are trimmed or merged where the platform has no corresponding
real feature (documented explicitly, not silently dropped) — e.g. there is
no separate "compaction" feature to document beyond Iceberg's own behavior,
so `08-advanced-data-engineering` covers it as a topic inside a document
rather than inventing a dedicated UI feature.

```
docs/olist-openlakehouse-docs/
├── README.md
├── GAP_ANALYSIS.md
├── MASTER_PLAN.md
├── PROGRESS.md
│
├── 00-project-overview/
│   ├── 01-project-objectives.md
│   ├── 02-business-context.md
│   ├── 03-functional-requirements.md
│   ├── 04-non-functional-requirements.md
│   ├── 05-project-scope.md
│   ├── 06-prerequisites.md
│   └── 07-learning-roadmap.md
│
├── 01-architecture/
│   ├── 01-platform-architecture.md
│   ├── 02-logical-architecture.md
│   ├── 03-physical-architecture.md
│   ├── 04-data-flow.md
│   ├── 05-component-interactions.md
│   ├── 06-network-architecture.md
│   ├── 07-security-architecture.md
│   ├── 08-deployment-architecture.md
│   └── 09-architecture-decisions.md   (ADR-001..014 in one indexed doc)
│
├── 02-source-and-data-model/
│   ├── 01-olist-dataset.md
│   ├── 02-source-data-profiling.md
│   ├── 03-source-data-quality.md
│   ├── 04-source-relationships.md
│   ├── 05-grain-analysis.md
│   ├── 06-dimensional-modeling.md
│   ├── 07-star-schema.md
│   └── 08-business-metrics.md
│
├── 03-bronze-ingestion/
│   ├── 01-ingestion-architecture.md
│   ├── 02-jupyter-pyspark-ingestion.md
│   ├── 03-schema-inference.md
│   ├── 04-raw-data-preservation.md
│   ├── 05-reprocessing.md
│   ├── 06-idempotency.md
│   ├── 07-ingestion-failures.md
│   └── 08-bronze-testing.md
│
├── 04-silver-transformation/
│   ├── 01-silver-architecture.md
│   ├── 02-data-cleaning.md
│   ├── 03-type-casting.md
│   ├── 04-deduplication.md
│   ├── 05-null-handling.md
│   ├── 06-schema-enforcement.md
│   ├── 07-data-quality-gates.md
│   ├── 08-business-rules.md
│   ├── 09-incremental-processing.md
│   └── 10-silver-testing.md
│
├── 05-pipeline-builder/
│   ├── 01-fundamentals.md
│   ├── 02-basic-nodes.md
│   ├── 03-transformations.md
│   ├── 04-quality-nodes.md
│   ├── 05-advanced-nodes.md
│   ├── 06-variables.md
│   ├── 07-control-flow.md
│   ├── 08-python-pyspark-sql.md
│   ├── 09-api-ingestion.md
│   ├── 10-sub-pipelines.md
│   ├── 11-dbt-integration.md
│   ├── 12-error-handling.md
│   ├── 13-reusable-pipelines.md
│   └── 14-fourteen-pipeline-scenarios.md
│
├── 06-dbt/
│   ├── 01-dbt-architecture.md
│   ├── 02-project-structure.md
│   ├── 03-sources.md
│   ├── 04-staging-models.md
│   ├── 05-intermediate-models.md
│   ├── 06-marts.md
│   ├── 07-tests.md
│   ├── 08-snapshots.md
│   ├── 09-incremental-models.md
│   ├── 10-documentation.md
│   └── 11-production-dbt.md
│
├── 07-dimensional-modeling/
│   ├── 01-dimensional-modeling-fundamentals.md
│   ├── 02-dimension-design.md
│   ├── 03-date-dimension.md
│   ├── 04-customer-dimension.md
│   ├── 05-product-dimension.md
│   ├── 06-seller-dimension.md
│   ├── 07-scd-type-0-and-1.md
│   ├── 08-scd-type-2-fundamentals.md
│   ├── 09-scd2-manual-merge.md
│   ├── 10-scd2-dbt-snapshot.md
│   ├── 11-scd2-testing.md
│   ├── 12-scd2-failure-scenarios.md
│   ├── 13-scd2-late-and-out-of-order-changes.md
│   ├── 14-scd2-fact-lookup-and-temporal-joins.md
│   └── 15-scd2-production-patterns.md
│
├── 08-advanced-data-engineering/
│   ├── 01-incremental-processing.md
│   ├── 02-idempotency-and-semantics.md
│   ├── 03-schema-evolution-and-drift.md
│   ├── 04-late-arriving-data.md
│   ├── 05-duplicate-events.md
│   ├── 06-backfills-and-replay.md
│   ├── 07-partitioning-and-small-files.md
│   ├── 08-performance-optimization.md
│   └── 09-metadata-driven-and-parameterized-pipelines.md
│
├── 09-orchestration/
│   ├── 01-dagster-fundamentals.md
│   ├── 02-pipeline-dependencies.md
│   ├── 03-scheduling.md
│   ├── 04-retries-and-failure-recovery.md
│   ├── 05-backfills.md
│   └── 06-production-orchestration.md
│
├── 10-data-quality/
│   ├── 01-quality-strategy.md
│   ├── 02-completeness-and-uniqueness.md
│   ├── 03-validity-and-schema.md
│   ├── 04-referential-integrity.md
│   ├── 05-freshness.md
│   ├── 06-business-rules.md
│   ├── 07-quality-dashboard.md
│   └── 08-quality-failure-scenarios.md
│
├── 11-lineage-and-governance/
│   ├── 01-lineage.md
│   ├── 02-er-model.md
│   ├── 03-metadata-and-catalog.md
│   └── 04-impact-analysis.md
│
├── 12-bi-and-analytics/
│   ├── 01-superset-architecture.md
│   ├── 02-dataset-models-and-metrics.md
│   ├── 03-executive-dashboard.md
│   ├── 04-sales-dashboard.md
│   ├── 05-customer-dashboard.md
│   ├── 06-logistics-dashboard.md
│   ├── 07-seller-and-product-dashboard.md
│   └── 08-advanced-analytics.md
│
├── 13-machine-learning/
│   ├── 01-ml-use-case-late-delivery.md
│   ├── 02-feature-engineering-and-leakage.md
│   ├── 03-model-training-and-evaluation.md
│   ├── 04-mlflow-tracking-and-registry.md
│   └── 05-deployment-monitoring-and-drift.md
│
├── 14-streaming-and-cdc/
│   ├── 01-streaming-architecture.md
│   ├── 02-kafka-fundamentals.md
│   ├── 03-spark-structured-streaming.md
│   ├── 04-debezium-cdc.md
│   ├── 05-ordering-dedup-and-merge.md
│   └── 06-streaming-production-scenarios.md
│
├── 15-observability/
│   ├── 01-observability-strategy.md
│   ├── 02-metrics-prometheus.md
│   ├── 03-logs-loki.md
│   ├── 04-traces-otel.md
│   ├── 05-dashboards-grafana.md
│   └── 06-incident-response.md
│
├── 16-security/
│   ├── 01-security-architecture.md
│   ├── 02-authentication-keycloak.md
│   ├── 03-authorization-and-rbac.md
│   ├── 04-secrets-and-encryption.md
│   └── 05-security-scenarios.md
│
├── 17-devops-and-version-control/
│   ├── 01-gitea-and-git-workflow.md
│   └── 02-ci-cd-and-release-management.md
│
├── 18-platform-operations/
│   ├── 01-connections.md
│   ├── 02-compute.md
│   └── 03-capacity-and-cost.md
│
├── 19-ai-assistant/
│   └── 01-ai-assistant.md
│
├── 20-testing/
│   ├── 01-testing-strategy.md
│   ├── 02-dbt-and-quality-tests.md
│   ├── 03-negative-testing.md
│   └── 04-full-test-matrix.md
│
├── 21-production-scenarios/
│   ├── 01-source-and-schema-incidents.md
│   ├── 02-pipeline-and-dbt-failures.md
│   ├── 03-streaming-and-kafka-incidents.md
│   ├── 04-data-quality-incidents.md
│   └── 05-security-incidents.md
│
├── 22-capstone/
│   └── 01-24-phase-capstone-project.md
│
└── 23-reference/
    ├── commands.md
    ├── configuration-reference.md
    ├── sql-reference.md
    ├── troubleshooting.md
    ├── glossary.md
    ├── faq.md
    ├── project-map.md
    └── interview-questions.md
```

## 2. Original chapter → new document mapping

| Original chapter | New location(s) |
|---|---|
| Ch.0 Prerequisites & access matrix | `00-project-overview/06-prerequisites.md` |
| Ch.1 Platform architecture recap | `01-architecture/01..09` (fully expanded) |
| Ch.2 Olist dataset & target model | `02-source-and-data-model/01..08` |
| Ch.3 Bronze ingestion | `03-bronze-ingestion/01..08` |
| Ch.4 Exploring data | `02-source-and-data-model/02-source-data-profiling.md` + `23-reference/sql-reference.md` |
| Ch.5 Pipeline Builder fundamentals | `05-pipeline-builder/01-fundamentals.md` |
| Ch.6 Bronze→Silver + quality | `04-silver-transformation/01..10` |
| Ch.7 dbt + dbt UI + dbt node | `06-dbt/01..11` + `05-pipeline-builder/11-dbt-integration.md` |
| Ch.8 Dimension tables | `07-dimensional-modeling/01..06` |
| Ch.9 SCD Type 2 deep dive | `07-dimensional-modeling/07..15` (9 documents — the single biggest expansion) |
| Ch.10 Fact tables | `07-dimensional-modeling/` (grain/measures) + new fact docs folded into `02-source-and-data-model/08-business-metrics.md` |
| Ch.11 Advanced Pipeline Engine | `05-pipeline-builder/05..10` |
| Ch.12 Advanced end-to-end pipeline | `05-pipeline-builder/14-fourteen-pipeline-scenarios.md` |
| Ch.13 Quality/Lineage/ER | `10-data-quality/*` + `11-lineage-and-governance/*` |
| Ch.14 Dagster | `09-orchestration/01..06` |
| Ch.15 Superset | `12-bi-and-analytics/01..08` |
| Ch.16 MLflow | `13-machine-learning/01..05` |
| Ch.17 Streaming & CDC | `14-streaming-and-cdc/01..06` |
| Ch.18 Gitea | `17-devops-and-version-control/01..02` |
| Ch.19 Observability | `15-observability/01..06` |
| Ch.20 Connections & Compute | `18-platform-operations/01..03` |
| Ch.21 AI Assistant | `19-ai-assistant/01-ai-assistant.md` |
| Ch.22 RBAC/Admin/security | `16-security/01..05` |
| Ch.23 Capstone | `22-capstone/01-24-phase-capstone-project.md` |
| *(new, not in original)* | `08-advanced-data-engineering/*`, `20-testing/*`, `21-production-scenarios/*`, `23-reference/*` |

No original content is deleted — every fact, code block, gotcha, and
checkpoint from `OLIST_END_TO_END_GUIDE.md` is preserved and expanded in its
new home. The original single-file guide remains in `docs/` unchanged as a
quick-start reference; this repository is the deep, multi-document version.

## 3. Build sequencing (this is a multi-session effort)

Given the requested depth (dozens of documents, many 15–40+ pages), this is
built incrementally, tracked in [`PROGRESS.md`](PROGRESS.md), in this order:

1. `00-project-overview/` + `01-architecture/` (foundation — done first so
   every later document can link back to consistent terminology/diagrams)
2. `02-source-and-data-model/` + `07-dimensional-modeling/` (the modeling
   core — the area with the largest expansion request, SCD2 especially)
3. `03-bronze-ingestion/` + `04-silver-transformation/` + `05-pipeline-builder/`
4. `06-dbt/`
5. `08-advanced-data-engineering/` + `09-orchestration/` + `10-data-quality/`
   + `11-lineage-and-governance/`
6. `12-bi-and-analytics/` + `13-machine-learning/` + `14-streaming-and-cdc/`
7. `15-observability/` + `16-security/` + `17-devops-and-version-control/`
   + `18-platform-operations/` + `19-ai-assistant/`
8. `20-testing/` + `21-production-scenarios/`
9. `22-capstone/` + `23-reference/`
10. Final cross-reference / terminology / consistency audit
