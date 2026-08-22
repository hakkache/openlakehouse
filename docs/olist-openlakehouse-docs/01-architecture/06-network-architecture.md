# 06 — Network Architecture

**Content type: CURRENT PLATFORM CAPABILITY** — this is one of the more
consequential "don't invent capability" documents: many admin UIs are
**not** proxied through Traefik, and this document exists specifically to
make that permanent and explicit.

## Purpose

Prevent the single most common environment mistake in this project:
assuming every service is reachable the same way (through Traefik at
`http://localhost`).

## The one Docker network

Every container in `docker-compose.yml` joins a single bridge network
(`openlakehouse-net` or equivalent). There is no network segmentation
between "frontend-tier" and "data-tier" containers today — any container
can reach any other by service name. This is a real, current
simplification (see `16-security/06-network-security.md` for the
production-hardening discussion of this).

## Traefik-routed vs. direct-port services

| Traefik-routed (via `http://localhost`) | Direct host port only |
|---|---|
| Frontend (`/`) | Jupyter (`:8888`) |
| Backend API (`/api/*`) | Superset (`:8088`) |
| | MLflow (`:5000`) |
| | Dagster (`:3001`) |
| | Gitea (`:3010`) |
| | Grafana (`:3300`) |
| | Prometheus (`:9090`) |
| | OpenMetadata (`:8585`) |
| | Keycloak (`:8081`) |

**Practical consequence**: any tutorial step, screenshot, or script in
this repository that says "open Superset" means `http://localhost:8088`
directly — never `http://localhost/superset` or similar, because no such
Traefik route exists. Treat this table as authoritative whenever a new
document in this repository references a service URL.

## Why the frontend's own dev server can silently misbehave

The Vite dev server (`npm run dev`, port 5173) proxies GET requests
reasonably but is **not** configured to forward the same way Traefik does
for all methods/headers used by POST/PUT flows — API writes issued while
browsing the raw Vite port instead of through Traefik have, in real
project history, resulted in confusing 405s. Always test end-to-end
functionality via `http://localhost` (Traefik), not the raw Vite port.

## Firewall / exposure notes (dev-only stack)

All of the above ports are bound to the Docker host with no additional
firewalling in this dev-oriented `docker-compose.yml` — acceptable for a
local learning environment, explicitly **not** acceptable as-is for any
network-reachable deployment. See
`16-security/06-network-security.md` for what a production network
architecture would additionally require (reverse-proxy-only exposure,
internal-only admin UIs behind a VPN/bastion, TLS termination) — marked
there as a **PROPOSED EXTENSION**, since none of it is built today.

## Next document

[`07-security-architecture.md`](07-security-architecture.md).
