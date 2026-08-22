# Configuration Reference

**Content type: REFERENCE.** Real, verified default configuration values
referenced throughout this documentation set — always confirm against
your own actual `.env`/`docker-compose.yml` before relying on these, since
any of them may have been customized in your environment.

## Real service URLs (direct, non-Traefik-proxied admin UIs)

| Service | URL | Notes |
|---|---|---|
| OpenLakehouse app | `http://localhost` | Traefik-proxied |
| Dagster | `http://localhost:3001` | not proxied |
| MLflow | `http://localhost:5000` | not proxied |
| Superset | `http://localhost:8088` | not proxied, own local auth |
| Keycloak | `http://localhost:8180` | adjust to your real mapped port |
| Gitea | `http://localhost:3002` | adjust to your real mapped port |
| Grafana | `http://localhost:3000` | adjust to your real mapped port |
| Prometheus | `http://localhost:9090` | adjust to your real mapped port |

## Real backend config defaults (`backend/app/core/config.py`)

| Setting | Default |
|---|---|
| `superset_url` | `http://superset:8088` |
| `superset_public_url` | `http://localhost:8088` |
| `ollama_url` | `http://ollama:11434` |
| `ollama_model` | `llama3.2:1b` |

## Real Keycloak realm roles (`infra/keycloak/realm-export.json`)

`ADMIN`, `DATA_ENGINEER`, `DATA_ANALYST`, `VIEWER` — with demo users
`admin.user`, a data-engineer user, a data-analyst user, `viewer.user`.

## Real secrets handling

- Connection passwords encrypted at rest via Fernet, key derived from
  `backend_secret_key` (SHA-256) — see
  [`16-security/04-secrets-and-encryption.md`](../16-security/04-secrets-and-encryption.md).
- Superset uses its own local admin account, **not** Keycloak SSO.

## Real Iceberg/dbt schema layer names

`bronze`, `silver`, `gold` (Iceberg schemas under the `iceberg` catalog);
dbt's own generated schemas typically prefixed per
`macros/get_custom_schema.sql`'s override — verify your actual dbt
schema names via `SHOW SCHEMAS FROM iceberg`.

## Next reference document

[`sql-reference.md`](sql-reference.md).
