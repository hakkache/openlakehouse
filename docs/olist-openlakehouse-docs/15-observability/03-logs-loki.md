# 03 — Logs with Loki

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`infra/loki/loki-config.yml`, `infra/promtail/promtail-config.yml`).**

## Hands-On Walkthrough — real LogQL queries

1. In Grafana, open **Explore**, select the **Loki** datasource.
2. Query real backend logs from a pipeline run you triggered earlier:
   ```logql
   {container="openlakehouse-backend"} |= "pipeline"
   ```
   **Expected result**: real log lines referencing actual pipeline
   run IDs from modules 04/05/09 — genuine application logs, not
   placeholders.
3. Query real Trino query logs:
   ```logql
   {container="openlakehouse-trino"} |= "SELECT"
   ```
4. Trace a real error: deliberately trigger a failed pipeline (e.g. the
   invalid `pipeline_id` scenario from
   [`09-orchestration/04-retries-and-failure-recovery.md`](../09-orchestration/04-retries-and-failure-recovery.md)),
   then query:
   ```logql
   {container="openlakehouse-backend"} |= "not found"
   ```
   **Expected result**: the real error log line matching your just-
   triggered failure, with a real timestamp matching when you triggered
   it moments ago.

## Real retention behavior worth confirming

5. Note `loki-config.yml`'s `reject_old_samples_max_age: 168h` (7 days)
   — Loki will reject log lines older than 7 days from "now" if ever
   ingested late; this is a real, documented ingestion-time constraint
   (not a query-time retention limit), relevant if you ever backfill logs
   from an external source.

> 🧪 **Checkpoint**: you found the real log line corresponding to a
> pipeline failure you deliberately triggered moments earlier, via a real
> LogQL query.

## Next document

[`04-traces-otel.md`](04-traces-otel.md).
