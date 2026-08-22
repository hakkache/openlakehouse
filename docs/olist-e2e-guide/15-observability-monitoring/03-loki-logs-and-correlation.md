# 03 — Loki Logs and Correlation

## Scenario 3 (Medium→Complex) — logs via Loki, correlated to a real error

1. In Grafana's **Explore**, select the Loki datasource, query
   `{container="backend"}`. Trigger the invalid-`pipeline_id` failure
   from module 09 doc 03. **Expected result**: the real error log line
   appears in Loki within seconds, timestamp-correlated with the Dagster
   failure you triggered.

## Correlation checklist

| Signal | Where to look | What confirms correlation |
|---|---|---|
| Dagster run failure | Dagster UI run detail | real failure timestamp |
| Backend error log | Loki (`{container="backend"}`) | same real timestamp, matching error text |

> 🧪 **Checkpoint**: matched a real Dagster failure's timestamp to its
> corresponding Loki log line within seconds of each other.

## Next document

[`04-alerting-and-incident-drill.md`](04-alerting-and-incident-drill.md).
