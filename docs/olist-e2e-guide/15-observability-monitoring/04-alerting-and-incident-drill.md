# 04 — Alerting and a Full Incident Drill

## Scenario 4 (Complex) — a real alert, end to end

1. Add a Prometheus alerting rule (e.g. `up == 0 for 1m` on the backend
   job). Stop the backend container
   (`docker compose stop backend`). **Expected result**: the rule fires
   in Prometheus's **Alerts** page within the configured `for` window.
   Restart the backend, confirm it resolves.

## Scenario 5 (Complex, incident-response drill) — root-cause a real induced failure

2. Deliberately fill Postgres's connection pool (open many long-lived
   raw `psql` sessions) while normal app traffic continues. **Expected
   result**: real elevated latency/error-rate visible in Grafana, a real
   `FATAL: too many connections` line in Loki — use both together to
   diagnose before killing the extra sessions and confirming recovery in
   the dashboards.

## Incident timeline table (fill in with your own real timestamps)

| Time | Event |
|---|---|
| T+0 | extra Postgres sessions opened |
| T+? | Grafana shows elevated latency/errors |
| T+? | Loki shows `FATAL: too many connections` |
| T+? | extra sessions killed |
| T+? | Grafana/Loki confirm recovery |

> 🧪 **Checkpoint**: 1 real alert fired and resolved end-to-end, and 1
> full induced-failure → diagnose → recover drill completed using
> metrics + logs together.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../16-security-keycloak-rbac/00-index.md`](../16-security-keycloak-rbac/00-index.md).
