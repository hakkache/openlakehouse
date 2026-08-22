# 03 — Hands-On: Confirm the Real Topology Yourself

## Walkthrough

1. `docker compose ps` — list every running container, note real
   container names (you'll use these with `docker compose exec` and
   `docker exec` throughout this guide).
2. `docker network inspect openlakehouse-net` (or your compose project's
   actual network name) — confirm every service from doc 01 is attached
   to one shared network — this is *why* e.g. Superset can reach
   `trino:8080` by service name alone, no public DNS involved.
3. Open `http://localhost` in a browser. **Expected result**: redirected
   to a real Keycloak login page — confirms the SSO wiring, not a
   custom login form baked into the frontend.
4. Open Trino's own UI (check your compose port mapping). **Expected
   result**: a real cluster page showing worker count and query history
   — empty at this point, since you haven't run anything yet.
5. `docker compose logs --tail=20 spark-master` — confirm it's a real,
   independently running Spark master process, not something proxied
   through the backend.
6. `docker exec -it <postgres-container> psql -U <user> -d <db> -c "\dt"` —
   confirm the app's own Postgres metadata tables (pipelines,
   connections, pipeline_runs, etc.) exist and are separate from any
   Olist data tables (which live in Iceberg/MinIO, not Postgres).

> 🧪 **Checkpoint**: you can name every service from doc 01's diagram,
> state its real purpose in one sentence, and have visually confirmed at
> least 4 of them are actually running and reachable — not just present
> in `docker-compose.yml`.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../02-environment-setup-and-first-login/00-index.md`](../02-environment-setup-and-first-login/00-index.md).
