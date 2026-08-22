# 03 — First Tour and First Query

## Hands-On Walkthrough — tour the real app navigation

1. Log in as `admin.user`. Tour the left navigation — note every
   top-level page (Pipelines, dbt, Jobs, Lineage, Dashboards,
   Connections, Compute, Assistant, Catalog/Data Explorer, etc.). Each
   maps 1:1 to a module of this guide — keep a mental map as you go.

## Hands-On Walkthrough — first real query, confirming end-to-end plumbing

2. Open the app's **SQL Editor** page (or equivalent), run:
   ```sql
   SHOW SCHEMAS FROM iceberg;
   ```
   **Expected result**: a real schema list — likely just system schemas
   at this point (`information_schema`, maybe empty `bronze`/`silver`/
   `gold` if a prior session created them) — if this returns cleanly with
   no error, the full API → Trino → Polaris → MinIO chain is confirmed
   working end to end, **before** you've built anything.

## The real per-user "workspace" concept in this platform

There's no separate "create a new workspace" object in this platform —
your **workspace** is the combination of (a) your Keycloak identity/role,
(b) the pipelines/connections/dashboards you create under it, and (c) the
shared Iceberg catalog everyone reads/writes through Trino. This is a
deliberate design choice for a lakehouse (shared, governed data; scoped
compute) rather than isolated per-user sandboxes — confirmed by there
being no "workspace" API resource under `backend/app/api/v1/`.

3. Confirm this yourself: log in as a second real user (e.g.
   `viewer.user`), open **Catalog**. **Expected result**: they see the
   **same** shared `iceberg` catalog and any tables you've already
   created — proving data is shared platform-wide, not siloed per user.

> 🧪 **Checkpoint**: you've toured every top-level nav page, run one
> real query confirming the full stack's plumbing works end-to-end, and
> confirmed with a second login that the catalog is genuinely shared,
> not per-user.

## Back to module index / continue the guide

[`00-index.md`](00-index.md) — or continue to
[`../03-data-model-and-source-analysis/00-index.md`](../03-data-model-and-source-analysis/00-index.md).
