# 02 — Grafana Dashboards

## Scenario 2 (Medium) — Grafana dashboards, real metrics

1. Open Grafana (`http://localhost:3000`), open the pre-provisioned
   dashboard(s) under **Dashboards** (from `infra/grafana/provisioning/`).
2. Trigger real load: re-run several pipelines from module 06 back-to-
   back. **Expected result**: a real, visible spike in backend
   request-rate/latency panels within the 15s scrape interval.

## Before/after

| Panel | Before load | During load |
|---|---|---|
| Request rate | baseline/near-zero | a real, visible spike |
| Latency (p50/p95) | baseline | may increase depending on real load |

> 🧪 **Checkpoint**: watched a real load spike (from your own triggered
> pipeline runs) propagate into a Grafana panel within 15-30 seconds.

## Next document

[`03-loki-logs-and-correlation.md`](03-loki-logs-and-correlation.md).
