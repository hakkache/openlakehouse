# 04 — Traces with OpenTelemetry

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`infra/otel/otel-collector-config.yml`).**

## Hands-On Walkthrough — trace a real API request end-to-end

1. Trigger a real, traceable request — run a pipeline via the API
   (`/pipelines/{id}/run`, per module 05).
2. Open Grafana → **Explore** → select the Tempo/trace datasource (if
   configured) or query the OTel Collector's own exposed metrics
   directly: `http://localhost:8888/metrics` (the
   `otel-collector:8888` target already scraped by Prometheus, per
   module 15 doc 01).
3. **Expected result**: real span-count and receiver/exporter metrics
   for the request you just triggered — confirms the collector is
   actively processing telemetry, not just idling.
4. If a full trace-visualization backend (Tempo/Jaeger) is configured in
   your compose setup, search for a trace ID corresponding to your
   pipeline run's request — **expected result**: a real span tree
   showing backend → Trino query time as separate, measurable segments,
   letting you see exactly where time was spent for that one request.

## The honest scope of tracing in this project today

**Documented gap**: this project wires the OTel Collector as a real
telemetry pipeline component, but a dedicated trace-storage/visualization
backend (Tempo, Jaeger) may not be part of the default compose profile —
verify by checking `docker-compose.yml` for such a service. If absent,
this is the concrete next piece to add for full trace visualization; the
Collector itself is real and running regardless.

> 🧪 **Checkpoint**: you confirmed the OTel Collector is actively
> receiving/processing telemetry for a real request you triggered, and
> can state whether a full trace-visualization UI is present in your
> actual compose setup.

## Next document

[`05-dashboards-grafana.md`](05-dashboards-grafana.md).
