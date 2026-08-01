# OpenMetadata Ingestion (Phase 8 — Catalog)

OpenLakehouse does not deploy Airflow. Metadata ingestion into OpenMetadata is
performed via one-off runs of the `openmetadata/ingestion` CLI image, attached
to the `openlakehouse-net` Docker network. This directory holds the workflow
YAML templates used for that ingestion.

## Prerequisites

- `opensearch`, `openmetadata-migrate` (one-off, must exit 0), and
  `openmetadata-server` must all be up and healthy:
  ```
  docker compose --profile data-engineering up -d opensearch
  docker compose --profile data-engineering up openmetadata-migrate
  docker compose --profile data-engineering up -d openmetadata-server
  ```
- Pull the ingestion CLI image once: `docker pull openmetadata/ingestion:1.13.3`

## Running an ingestion workflow

The workflow YAMLs in this directory use a `${OM_JWT_TOKEN}` placeholder
instead of a hardcoded bot token (do not commit real tokens). Generate a
runtime copy with a real token before each run:

```powershell
# 1. Obtain an admin JWT (default credentials: admin@open-metadata.org / admin,
#    base64-encoded password "YWRtaW4=")
$body = @{ email = "admin@open-metadata.org"; password = "YWRtaW4=" } | ConvertTo-Json
$token = (Invoke-RestMethod -Uri "http://localhost:8585/api/v1/users/login" -Method Post -Body $body -ContentType "application/json").accessToken

# 2. Substitute the token into a runtime copy (not committed to git)
(Get-Content infra\openmetadata\postgres-ingestion.yaml -Raw) -replace '\$\{OM_JWT_TOKEN\}', $token | Set-Content infra\openmetadata\postgres-ingestion.run.yaml

# 3. Run the ingestion
docker run --rm --network openlakehouse-net -v "${PWD}\infra\openmetadata\postgres-ingestion.run.yaml:/workflow.yaml" openmetadata/ingestion:1.13.3 python -m metadata ingest -c /workflow.yaml

# 4. Delete the generated file containing the token
Remove-Item infra\openmetadata\postgres-ingestion.run.yaml
```

Repeat the same steps for `trino-ingestion.yaml` to catalog the Iceberg
catalog (`bronze` schema tables) served through Trino.

## Files

- `postgres-ingestion.yaml` — ingests the application's own Postgres database
  (`openlakehouse`), cataloging all tables in the `public` schema.
- `trino-ingestion.yaml` — ingests the `iceberg` catalog via Trino, cataloging
  real Iceberg tables (e.g. `bronze.test`, `bronze.pipeline_smoke_test`)
  created in earlier phases.

## Known limitations

- No Airflow integration: ingestion is CLI/one-off only, not scheduled from
  the OpenMetadata UI.
- OpenMetadata uses its own basic auth (`admin@open-metadata.org` / `admin`),
  not integrated with the project's Keycloak SSO.
- No Traefik routing yet; OpenMetadata UI is reachable directly at
  `http://localhost:8585`.
