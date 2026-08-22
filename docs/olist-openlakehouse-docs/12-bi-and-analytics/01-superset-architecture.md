# 01 — Superset Architecture

**Content type: CURRENT PLATFORM CAPABILITY (verified from
`backend/app/core/superset_client.py`, `backend/app/api/v1/dashboards.py`,
`frontend/src/pages/DashboardsPage.tsx`, `infra/superset/superset_config.py`).**

## Real architecture: Superset is separate-auth, list-proxied, link-out

**Verified facts**:
- Superset runs at `http://localhost:8088` directly (not Traefik-proxied,
  same pattern as Dagster/Jupyter admin UIs).
- Superset has **its own local admin account** (`admin` /
  `openlakehouse_dev_password` by default), **not** integrated with
  Keycloak SSO — a real, documented gap (`superset_client.py`'s own
  docstring states this explicitly).
- The backend's `GET /v1/dashboards/status` endpoint logs into Superset's
  REST API using that local admin account and proxies back a real list of
  published dashboards — the OpenLakehouse app's **Dashboards** page is a
  read-only list/link-out view, not an embedded iframe.
- Superset's own metadata lives in a dedicated `superset` Postgres
  database (`SUPERSET_METADATA_DB`), using Redis DB 2 for caching
  (`infra/superset/superset_config.py`).

## Hands-On Walkthrough — confirm the real proxy end-to-end

1. Open `http://localhost/dashboards` (the OpenLakehouse app's own page).
   **Expected result** (before you've built anything in Superset yet):
   "Superset is running but no dashboards have been published yet."
2. Open `http://localhost:8088` directly, log in with
   `admin`/`openlakehouse_dev_password`.
3. Create a placeholder dashboard (**Dashboards** → **+ Dashboard**,
   name it `Olist Test`, save with no charts yet).
4. Return to `http://localhost/dashboards` and refresh. **Expected
   result**: `Olist Test` now appears in the list — real proof the
   backend is genuinely querying Superset's live REST API, not a cached
   or fake list.

> 🧪 **Checkpoint**: you created a dashboard directly in Superset and
> watched it appear moments later in the OpenLakehouse app's own
> Dashboards page — confirming the real proxy relationship.

## Next document

[`02-dataset-models-and-metrics.md`](02-dataset-models-and-metrics.md).
