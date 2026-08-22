# 01 — Prometheus Targets

## Scenario 1 (Simple) — confirm real scrape targets

1. Open Prometheus (`http://localhost:9090`) → **Status → Targets**.
   **Expected result**: all ~10 real jobs show `UP` (backend, Trino,
   Spark, Kafka, Postgres exporter, etc. — list whichever your
   `infra/prometheus/prometheus.yml` actually defines).
2. Run a real ad-hoc query: `up == 0` — should return empty if healthy.

| Job | Expected status |
|---|---|
| backend | UP |
| trino | UP |
| spark | UP |
| kafka | UP |
| postgres-exporter | UP |
| (+ your remaining real jobs) | UP |

> 🧪 **Checkpoint**: `up == 0` returns zero results across all real
> scrape jobs.

## Next document

[`02-grafana-dashboards.md`](02-grafana-dashboards.md).
