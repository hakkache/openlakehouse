# 02 — Metrics with Prometheus

**Content type: CURRENT PLATFORM CAPABILITY (verified).**

## Hands-On Walkthrough — real PromQL queries against real data

1. Open Prometheus (`http://localhost:9090`) → **Graph**.
2. Query real backend request activity (after generating some traffic —
   run a few pipeline executions from earlier modules first):
   ```promql
   rate(http_requests_total{job="openlakehouse-backend"}[5m])
   ```
   **Expected result**: a real non-zero rate if you've been actively
   using the app in this session, `0` if idle — either way, a genuine
   live metric, not a static value.
3. Query real Trino query throughput:
   ```promql
   trino_execution_QueryManager_RunningQueries{instance="trino:9270"}
   ```
4. Query real Spark executor activity (after running any Spark job from
   modules 07/08/13):
   ```promql
   metrics_master_workers_Value{instance="spark-master:8080"}
   ```
5. Query real Kafka consumer lag (same metric surfaced via
   `kafka-exporter`, complementing the CLI check from
   [`14-streaming-and-cdc/06-streaming-production-scenarios.md`](../14-streaming-and-cdc/06-streaming-production-scenarios.md)):
   ```promql
   kafka_consumergroup_lag{consumergroup="streaming-orders-group"}
   ```

## Building a real alert rule

6. In `infra/prometheus/prometheus.yml`, add a `rule_files:` entry
   pointing at a new `alerts.yml` with a real, meaningful rule:
   ```yaml
   groups:
     - name: openlakehouse
       rules:
         - alert: HighKafkaLag
           expr: kafka_consumergroup_lag > 1000
           for: 5m
   ```
7. Restart Prometheus (`docker compose restart prometheus`), confirm the
   rule loads: **Status** → **Rules**. **Expected result**: `HighKafkaLag`
   appears with state `inactive` (until lag genuinely exceeds 1000 for 5
   minutes).

> 🧪 **Checkpoint**: you ran 5 real PromQL queries against genuinely live
> metrics, and added a real alert rule that Prometheus confirms it
> loaded.

## Next document

[`03-logs-loki.md`](03-logs-loki.md).
