# 03 — A Full Multi-Type Operational Audit

## Scenario 3 (Complex) — a full audit across every real connection type

1. Systematically test every connection type your deployment defines,
   recording each real result.

| Connection type | Test result | Notes |
|---|---|---|
| Postgres | your real result | |
| Kafka | your real result | |
| Trino | your real result | |
| (any others in your deployment) | your real result | |

2. Cross-reference any failures against Grafana/Loki (module 15) to
   confirm the same failure is visible from an independent
   observability angle — a genuine end-to-end operational check, not
   just a single UI's opinion.

> 🧪 **Checkpoint**: completed a full connection audit table with real
> results, cross-verified at least 1 result against an independent
> observability signal.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../19-ai-assistant/00-index.md`](../19-ai-assistant/00-index.md).
