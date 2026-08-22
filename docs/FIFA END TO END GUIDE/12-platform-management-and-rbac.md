# Part 12 — Platform Management, AI Assistant & RBAC

**[← Guide index](00-README.md)** · Part 12 of 14 · Previous: [Part 11 — Observability & Streaming/CDC](11-observability-and-streaming.md) · Next: [Part 13 — Testing Matrix & Troubleshooting →](13-testing-matrix-and-troubleshooting.md)

---

## Chapter 19 — Connections management

**Depends on:** nothing.

Open **Connections** (`/connections`):

1. **New Connection**, pick a type (Postgres, S3/MinIO, Kafka, etc.), fill
   in the fields, click **Test Connection** — calls the real backend
   connection-tester (not a stub) against the actual service.
2. Save it — it's now a picker option the next time you configure a
   source/destination node in the No-Code Builder.

> 🧪 **Test it:** deliberately enter a wrong host/port and click **Test
> Connection** — a real failure message, proving this isn't a "always
> succeeds" placeholder.

---

## Chapter 20 — Compute monitoring and process control

**Depends on:** any chapter that produces a running job ([Part 2](02-loading-and-exploring-data.md) Chapters 3, 5,
[Part 3](03-pipeline-builder-fundamentals.md) Chapter 7, [Part 4](04-gold-pipelines.md) Chapter 8, [Part 6](06-advanced-pipeline-engine-fundamentals.md)–[Part 8](08-advanced-pipeline-execution-rules-and-bugs.md) Chapter 12, [Part 9](09-orchestration-and-bi-dashboards.md) Chapter 13).

Open **Compute** (`/compute`) — live status for Spark (Master + Workers),
Trino, and Jupyter. Below the summary cards, three **detailed process
tables**:

- **Spark applications** — every app the Master tracks (running/completed),
  user, cores, memory/executor, submit time, state, duration.
- **Trino queries** — every tracked query, (truncated) SQL text, user,
  state, elapsed/queued time.
- **Jupyter kernels** — every live kernel, execution state, connection
  count, last-activity time.

`engineer.user`/`admin.user` get a red **Kill** button on each row; a
`VIEWER` sees the same tables read-only.

> 🧪 **Test it (live update):** trigger any pipeline run ([Part 9](09-orchestration-and-bi-dashboards.md) Chapter 13) or a
> PySpark Code cell ([Part 2](02-loading-and-exploring-data.md) §5.2) in one tab, watch the Spark worker card/table in
> another — active task/core counts and a new row appear in real time,
> settling back down once it finishes. Cross-check against the Spark
> Master UI at the same moment.

> 🧪 **Test it (kill a process):** start a PySpark Code cell with e.g. a
> small `time.sleep(60)` loop. Find it in the Compute page's table, click
> **Kill**, confirm. The row disappears within seconds — a real
> `DELETE`/`POST` round trip to Jupyter's kernel API / Spark Master's
> `/app/kill/` endpoint / Trino's query-cancel API, also recorded in the
> backend's audit log (`SPARK_APPLICATION_KILLED` / `TRINO_QUERY_KILLED` /
> `JUPYTER_KERNEL_KILLED`).

---

## Chapter 21 — AI Assistant

**Depends on:** any chapter (grounds its answers in whatever real data you
already have).

Open the **AI Assistant** panel. It runs on a local Ollama LLM with tool
access to the platform's own catalog/quality/lineage APIs. Ask:

- *"What tables are in the gold schema?"*
- *"Summarize the quality check results for silver.player_match_appearances"*

Answers reflect the real tables/results from your own session, not generic
boilerplate.

> 🧪 **Test it:** ask about a table name that doesn't exist — the answer
> should reflect that it genuinely queried the catalog and found nothing,
> not a hallucinated made-up schema.

---

## Chapter 22 — Platform Health

**Depends on:** nothing.

Open **Health** (`/health`) — a live rollup of every backend dependency
(Postgres, Trino, Spark, Kafka, MinIO, Keycloak, etc.) with per-service
status — a single "is everything actually up" screen, useful before/during
a demo.

> 🧪 **Test it:** stop one dependency (e.g. `docker compose stop kafka`),
> reload **Health** — it should flip to unhealthy/down for exactly that
> service within one refresh cycle. Restart it afterwards
> (`docker compose start kafka`).

---

## Chapter 23 — RBAC, roles, and Admin

**Depends on:** having tried several protected actions earlier
(pipeline run, PySpark Code, Compute kill buttons).

### 23.1 The role model

Roles are defined in Keycloak's realm export
(`infra/keycloak/realm-export.json`): `ADMIN`, `DATA_ENGINEER`, `ANALYST`,
`VIEWER`. Every protected backend endpoint checks the caller's roles
server-side (never just a disabled frontend button) — see the matrix in
[Part 1](01-orientation-setup-and-dataset.md)'s §0.4.

### 23.2 Step-by-step: compare two roles side by side

1. Log in as `engineer.user` / `openlakehouse` (`DATA_ENGINEER`). Confirm
   you *can*: create/run pipelines, use PySpark Code mode, run `python`/
   `pyspark` code nodes, kill Compute processes.
2. Log out, log back in as `admin.user` / `openlakehouse` (`ADMIN`). Open
   **Admin** (`/admin`) — user/role management backed by Keycloak.
3. (Optional, if a `VIEWER`-only test account exists) log in as that
   account and confirm the No-Code Builder's Run button and PySpark Code
   mode are unavailable/403, while catalog browsing and dashboards remain
   fully readable.

> 🧪 **Test it:** using a REST client (or the browser DevTools Network
> tab), copy a real request the app made while logged in as `ADMIN` (e.g.
> `POST /api/v1/pipelines/{id}/run` for a pipeline with a `pyspark` node),
> then repeat it with a `VIEWER` token — confirm a real 403, not a 200 with
> an empty/fake result.

---

**[← Guide index](00-README.md)** · Part 12 of 14 · Previous: [Part 11 — Observability & Streaming/CDC](11-observability-and-streaming.md) · Next: [Part 13 — Testing Matrix & Troubleshooting →](13-testing-matrix-and-troubleshooting.md)
