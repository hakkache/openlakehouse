# 04 — Full Test Matrix

**Content type: PROJECT IMPLEMENTATION.** Closes the module with one
consolidated checklist spanning every layer of the platform.

## The complete test matrix

| Layer | Test type | Where verified |
|---|---|---|
| Backend API | pytest smoke tests | This module, doc 01 |
| Authentication | 401 without token, 403 for wrong role | [`16-security/03-authorization-and-rbac.md`](../16-security/03-authorization-and-rbac.md) |
| Bronze | row counts match source CSVs | [`03-bronze-ingestion/`](../03-bronze-ingestion/) |
| Silver | quality gates, dedup, casting | [`04-silver-transformation/`](../04-silver-transformation/) |
| Pipeline Builder | all 10 real node kinds exercised | [`05-pipeline-builder/14-fourteen-pipeline-scenarios.md`](../05-pipeline-builder/14-fourteen-pipeline-scenarios.md) |
| dbt | generic + singular + SCD2 tests | This module, doc 02 |
| Gold/dimensional | referential integrity, SCD2 invariants | [`10-data-quality/`](../10-data-quality/), [`07-dimensional-modeling/`](../07-dimensional-modeling/) |
| Orchestration | real scheduled fire observed | [`09-orchestration/03-scheduling.md`](../09-orchestration/03-scheduling.md) |
| Streaming/CDC | real replay, real dedup fix | [`14-streaming-and-cdc/`](../14-streaming-and-cdc/) |
| ML | real holdout metrics, no leakage | [`13-machine-learning/`](../13-machine-learning/) |
| BI | dashboard numbers cross-checked against raw SQL | [`12-bi-and-analytics/06-logistics-dashboard.md`](../12-bi-and-analytics/06-logistics-dashboard.md) |
| Security | tampered JWT, injection, encryption at rest | [`16-security/`](../16-security/) |
| Observability | real incident detect→resolve cycle | [`15-observability/06-incident-response.md`](../15-observability/06-incident-response.md) |

## Hands-On Walkthrough — run the full matrix once, end to end

1. Work through each row above in order, re-confirming (not just
   re-reading) its real expected result in your own environment.
2. Record your own pass/fail per row in a simple table — this is your
   personal, genuine verification record for the entire platform, not a
   hypothetical checklist.
3. For any row that fails in your environment, treat it as the seed of
   a real incident — apply
   [`15-observability/06-incident-response.md`](../15-observability/06-incident-response.md)'s
   detect→diagnose→resolve→verify cycle to it.

> 🧪 **Checkpoint for the module**: you have your own real, personally-
> verified pass/fail record across every layer of this platform.

## Next module

[`21-production-scenarios/01-source-and-schema-incidents.md`](../21-production-scenarios/01-source-and-schema-incidents.md).
