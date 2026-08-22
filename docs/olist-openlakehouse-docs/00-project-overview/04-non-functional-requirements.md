# 04 — Non-Functional Requirements

**Content type: PROJECT IMPLEMENTATION** with explicit **CURRENT PLATFORM
CAPABILITY** vs. **PROPOSED EXTENSION** tagging throughout, since NFRs are
exactly where it's tempting to over-claim platform maturity.

## Purpose

State the quality attributes this project targets — performance, security,
observability, reliability — and honestly separate what the current
single-node Docker Compose deployment can actually deliver from what a
"real" production deployment would additionally require.

## Performance

- **CURRENT**: Trino/Spark run as single-instance services in Docker
  Compose on one host. This is adequate for the Olist dataset's real size
  (largest table ~1M rows, `olist_geolocation`) but is **not** a
  horizontally-scaled cluster.
- **PROPOSED EXTENSION**: multi-worker Spark/Trino clusters, resource
  pools, and query queuing for true production concurrency — see
  `08-advanced-data-engineering/08-performance-optimization.md` and
  `18-platform-operations/` for what would need to change.
- Target (achievable today, verified informally in prior sessions): a full
  Bronze→Silver→Gold pipeline run over the full Olist dataset completes in
  low minutes on a 32-CPU/32GB dev host — not a hard SLA, a sanity bound.

## Reliability / availability

- **CURRENT**: no multi-replica failover for Trino/Spark/Postgres/Kafka —
  a container crash is a real outage until Docker restarts it
  (`restart: unless-stopped` policies exist in `docker-compose.yml`, giving
  basic self-healing, not HA).
- Idempotent destination writes (`CREATE TABLE IF NOT EXISTS ... AS
  SELECT`, i.e. re-runs are a no-op unless the table is dropped first) are
  a **real, current** compiler behavior worth knowing before assuming a
  pipeline re-run "refreshes" data — see
  `08-advanced-data-engineering/01-incremental-processing.md`.

## Data quality

- **CURRENT**: quality-node violations (in the No-Code Builder) genuinely
  block downstream destination writes — a real reliability property
  ("bad data cannot silently land"), not aspirational.
- Target: 100% of Silver tables carry at least a `not_null`+`unique`
  quality gate on their natural key (a project convention, enforced by
  code review of pipeline definitions, not a platform-enforced constraint).

## Security

- **CURRENT**: authentication via Keycloak (OIDC), narrow role-gated
  actions (see `16-security/03-authorization-and-rbac.md`), encrypted
  connection secrets at rest (Fernet, `core/crypto.py`).
- **PROPOSED EXTENSION**: per-table/schema row-level access control,
  audit-log SIEM export, secret rotation automation — not built today.

## Observability

- **CURRENT**: Prometheus scraping 12 real targets, Grafana dashboards,
  Loki log aggregation via Promtail, OpenTelemetry traces from the
  backend — all genuinely deployed and verified (Phase 17). Dagster itself
  is **not** Prometheus-scraped (no lightweight metrics endpoint) — its
  logs flow into Loki instead. This is a documented, accepted platform
  limitation, not a gap this project closes.

## Maintainability

- Every pipeline is a versionable JSON definition (exportable via each
  pipeline's "Advanced: raw JSON" panel) and every dbt model is plain
  version-controlled SQL/YAML — both fit naturally into the Gitea-based
  version control workflow (`17-devops-and-version-control/`).

## Testability

- **CURRENT**: pipeline `Compile / Validate` (basic-kind pipelines only —
  advanced pipelines return a friendly 400 telling you to use Run instead,
  since there's no single compiled statement to preview), dbt
  `test`/`build`, and Quality-dashboard pass/fail history all provide real,
  inspectable test signal today. See `20-testing/`.

## Portability

- The entire stack is Docker Compose profile-gated (`--profile full` for
  everything) — this project does not require Kubernetes, though nothing
  about the architecture blocks a future migration (each service is
  already a discrete container with externalized config).

## Next document

[`05-project-scope.md`](05-project-scope.md).
