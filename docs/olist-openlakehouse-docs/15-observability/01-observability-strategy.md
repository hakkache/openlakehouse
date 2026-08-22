# 01 — Observability Strategy

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`infra/prometheus/prometheus.yml`, `infra/loki/loki-config.yml`,
`infra/otel/otel-collector-config.yml`).**

## The 3 real pillars, all genuinely wired

**Verified real scrape targets** (from `prometheus.yml`): backend
(`/metrics`), Postgres/Redis/Kafka/MinIO/Trino/Spark
master+worker/nginx exporters, and the OTel Collector itself — 10 real
scrape jobs, every 15 seconds.

## Hands-On Walkthrough — confirm every real target is actually being scraped

1. Open Prometheus directly: `http://localhost:9090` (adjust port to
   your actual compose mapping) → **Status** → **Targets**.
2. **Expected result**: all 10 jobs from `prometheus.yml` show state
   `UP` — if any show `DOWN`, that service isn't currently running;
   cross-check with `docker compose ps`.
3. Open Grafana (`http://localhost:3000` or your mapped port), confirm
   the Prometheus + Loki datasources (per
   [`05-dashboards-grafana.md`](05-dashboards-grafana.md)) are both
   green/working in **Connections** → **Data sources**.

## The strategic mapping used throughout this module

| Pillar | Tool | What it answers |
|---|---|---|
| Metrics | Prometheus | "Is X healthy/how much load" |
| Logs | Loki (via Promtail) | "What exactly happened, in what order" |
| Traces | OTel Collector | "Where did time actually go across services for one request" |

> 🧪 **Checkpoint**: you confirmed all 10 real Prometheus scrape targets
> are `UP` and both Grafana datasources are working.

## Next document

[`02-metrics-prometheus.md`](02-metrics-prometheus.md).
