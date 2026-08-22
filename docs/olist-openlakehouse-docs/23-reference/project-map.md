# Project Map

**Content type: REFERENCE.** A complete index of every module and
document in this repository.

| Module | Docs | Focus |
|---|---|---|
| `00-project-overview/` | — | Platform intro, prerequisites |
| `01-architecture/` | — | Overall system architecture |
| `02-source-and-data-model/` | — | Olist raw data, source quality |
| `03-bronze-ingestion/` | — | Raw-preserving ingestion via Jupyter/Spark |
| `04-silver-transformation/` | 10 | Pipeline Builder cleaning/typing/quality |
| `05-pipeline-builder/` | 14 | Every real node type, 14 capstone scenarios |
| `06-dbt/` | 11 | Staging/intermediate/marts/snapshots/tests |
| `07-dimensional-modeling/` | 15 | Star schema, SCD2, temporal joins |
| `08-advanced-data-engineering/` | 9 | Incrementality, idempotency, drift, backfills |
| `09-orchestration/` | 6 | Dagster real cron sensor scheduling |
| `10-data-quality/` | 8 | Completeness, integrity, freshness, gates |
| `11-lineage-and-governance/` | 4 | Real pipeline-derived lineage, ER model |
| `12-bi-and-analytics/` | 8 | Superset dashboards on real Gold data |
| `13-machine-learning/` | 5 | Late-delivery prediction, MLflow registry |
| `14-streaming-and-cdc/` | 6 | Kafka, Debezium, dedupe/MERGE |
| `15-observability/` | 6 | Prometheus/Loki/OTel/Grafana, incident response |
| `16-security/` | 5 | Keycloak, RBAC, encryption, security tests |
| `17-devops-and-version-control/` | 2 | Gitea, CI/CD |
| `18-platform-operations/` | 3 | Connections, compute, capacity |
| `19-ai-assistant/` | 1 | Local Ollama assistant |
| `20-testing/` | 4 | Full test strategy and matrix |
| `21-production-scenarios/` | 5 | Full incident-response narratives |
| `22-capstone/` | 1 | Full-platform integration project |
| `23-reference/` | 8 (this module) | Commands, config, SQL, glossary, FAQ |

## Next reference document

[`interview-questions.md`](interview-questions.md).
