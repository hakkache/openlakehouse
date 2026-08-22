# 08 — Deployment Architecture

**Content type: CURRENT PLATFORM CAPABILITY** (the real Docker Compose
deployment) + **PROPOSED EXTENSION** (what a multi-environment/production
deployment would additionally need).

## Purpose

Describe how this stack is actually deployed today, and what's genuinely
missing versus a production-grade deployment pipeline — without pretending
either gap doesn't exist.

## Current deployment model

- **Single environment**: one `docker-compose.yml`, one `.env`, run
  directly on a developer/lab host via `docker compose --profile <...> up
  -d --build`. There is no separate "staging" or "prod" compose file or
  environment-specific override layering shipped today.
- **Build**: each service with custom logic has its own `Dockerfile`
  (`backend/Dockerfile`, `frontend/Dockerfile`, `infra/*/Dockerfile`);
  third-party services (Postgres, Trino, Kafka, Keycloak, Superset base,
  etc.) use official upstream images pinned to explicit tags in
  `docker-compose.yml`.
- **Configuration**: environment variables via `.env` + compose
  `environment:` blocks; no external secrets manager integration.
- **State**: Docker named volumes for Postgres/MinIO/Gitea/Grafana/
  Prometheus/Ollama data — `docker compose down` (no `-v`) is safe;
  `-v` or manual volume deletion is destructive and irreversible.

## Startup / bring-up sequence

`docker compose up` respects `depends_on` (with `condition:
service_healthy` where healthchecks exist), so bring-up order is mostly
automatic — but first-boot latency varies a lot by service:
Keycloak/Postgres/MinIO come up in seconds; Ollama's model pull and
OpenMetadata's schema migration can take several minutes on first run.
`docker compose ps` and `docker compose logs -f <service>` are the primary
tools for confirming actual readiness beyond what `healthy` reports.

## What's genuinely missing vs. a production deployment (PROPOSED EXTENSION)

- No CI/CD pipeline building/pushing images automatically (this project's
  `17-devops-and-version-control/` module discusses using Gitea for
  source control but does not claim a built CI pipeline exists).
- No blue/green or rolling-update strategy — a `docker compose up -d
  --build <service>` recreates that one container, briefly interrupting
  it.
- No infra-as-code (Terraform/Pulumi) — the entire deployment surface is
  the one `docker-compose.yml`.
- No environment promotion path (dev → staging → prod configs) — this
  project's "production scenarios" module (`21-production-scenarios/`)
  simulates production **conditions** (load, failure, security incidents)
  against this same single-environment stack, it does not simulate a
  separate production *deployment*.

## Rollback story (real, today)

Because every Iceberg table write in this platform is either
`createOrReplace()`/`CREATE TABLE IF NOT EXISTS ... AS SELECT` (full
overwrite semantics) or an explicit `MERGE INTO`, and Iceberg itself
retains snapshot history, a bad transformation can genuinely be recovered
via Iceberg's own time-travel (`SELECT * FROM t FOR VERSION AS OF
<snapshot_id>` / `CALL iceberg.system.rollback_to_snapshot(...)`) — this is
real Iceberg capability the platform exposes through plain SQL, not a
custom platform feature. See
`21-production-scenarios/` for a worked incident using this.

## Next document

[`09-architecture-decisions.md`](09-architecture-decisions.md).
