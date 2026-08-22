# 01 — Booting the Stack

## Hands-On Walkthrough

1. From the repo root:
   ```powershell
   docker compose --profile full up -d --build
   docker compose ps
   ```
   **Expected result**: every core service shows `running`/`healthy`
   (allow a minute or two for slower-starting services like Trino/Spark/
   Keycloak — re-run `docker compose ps` until settled).
2. Tail the backend's logs to confirm it booted cleanly:
   ```powershell
   docker compose logs --tail=50 backend
   ```
   **Expected result**: no repeating stack traces; a real "Application
   startup complete" (or equivalent Uvicorn) line.
3. **Negative test — a real cosmetic gotcha**: if any exporter/sidecar
   container shows `unhealthy` despite the main service working fine
   (this happens with some off-the-shelf exporter images whose baked-in
   healthcheck is stricter than the metrics endpoint itself), verify the
   real endpoint directly (`curl http://localhost:<port>/metrics`) before
   assuming something is broken — a red status in `docker compose ps`
   isn't always a real incident.

| Command | Purpose |
|---|---|
| `docker compose --profile full up -d --build` | boot everything, rebuilding changed images |
| `docker compose ps` | real per-container health/status |
| `docker compose logs --tail=N <service>` | recent real logs for one service |
| `docker compose restart <service>` | restart one service without a full rebuild |
| `docker compose down` | stop everything (add `-v` only if you intend to wipe volumes — destructive) |

> 🧪 **Checkpoint**: `docker compose ps` shows every core service
> healthy, and you've confirmed at least one real log line proving the
> backend started cleanly.

## Next document

[`02-keycloak-roles-and-login.md`](02-keycloak-roles-and-login.md).
