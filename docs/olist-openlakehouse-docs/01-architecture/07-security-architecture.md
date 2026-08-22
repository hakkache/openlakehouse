# 07 — Security Architecture

**Content type: CURRENT PLATFORM CAPABILITY**, with clearly marked
**PROPOSED EXTENSION** call-outs — security is the domain most prone to
overstatement, so this document is deliberately conservative.

## Purpose

Describe exactly what security controls exist today, so
`16-security/` can build realistic, honest test scenarios rather than
testing against imagined controls.

## Authentication

- Keycloak (OIDC, Authorization Code + PKCE from the SPA frontend).
- Realm `openlakehouse`, client `openlakehouse-web` (public client, PKCE —
  no client secret in the frontend, correct practice for a SPA).
- Backend validates JWTs via `python-jose`, checking signature (Keycloak's
  JWKS endpoint), expiry, and audience/issuer claims (`core/keycloak.py`).
- Seeded users/roles (from `infra/keycloak/realm-export.json`):
  `admin.user` (ADMIN), `engineer.user` (DATA_ENGINEER), plus whatever
  additional demo users exist in that export — see
  `16-security/02-authentication.md` for the full list.

## Authorization (RBAC) — narrow, real, and precisely bounded

This is the single most important "don't overstate" fact in the whole
security domain. RBAC in this platform gates **exactly these things**:

1. Running a `python`/`pyspark` code node in a pipeline (ADMIN/
   DATA_ENGINEER only).
2. Connections CRUD (create/update/delete a saved connection).
3. Compute "kill" actions (cancelling a running Trino/Spark query/job).
4. Access to the `/admin` page/routes.

**Everything else** — viewing/creating/editing pipelines, running
non-code pipelines, viewing dashboards, viewing lineage/quality, running
dbt — is **not** further role-gated beyond "authenticated at all" today.
There is no per-table, per-schema, or per-pipeline ownership/ACL model.
Any document that implies otherwise is wrong; `16-security/03-
authorization-and-rbac.md` exists specifically to test and pin down this
exact boundary.

## Secrets at rest

- Connection credentials (e.g. a saved external Postgres/S3 connection)
  are encrypted at rest using Fernet symmetric encryption
  (`core/crypto.py`), keyed by an app-level secret from environment
  config — not a per-tenant KMS-backed key today.
- Keycloak admin credentials and default service passwords ship as
  plaintext defaults in `docker-compose.yml`/`.env` — acceptable for local
  dev, explicitly **not** acceptable for any real deployment (rotate
  every default credential before any non-local use).

## Audit logging

- `core/audit.py` + an `audit_log` table record sensitive actions
  (auth events, connection changes, pipeline runs, admin actions) with
  actor/timestamp/action/target — a real, queryable audit trail, though
  with no SIEM/export integration built today (PROPOSED EXTENSION).

## Transport security

- Traefik terminates plaintext HTTP on port 80 in this dev stack — no TLS
  is configured by default. A production deployment would add a TLS
  termination configuration (Traefik supports it natively) — **PROPOSED
  EXTENSION**, not built here.

## Next document

[`08-deployment-architecture.md`](08-deployment-architecture.md).
