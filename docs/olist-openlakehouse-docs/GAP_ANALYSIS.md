# Documentation Gap Analysis

> Phase 1 deliverable. Source material: [`docs/OLIST_END_TO_END_GUIDE.md`](../OLIST_END_TO_END_GUIDE.md)
> (24 chapters, single file, ~1,100 lines). This document identifies what the
> original guide already covers well, where it is too shallow for an
> enterprise-grade knowledge base, and what is missing outright. It is the
> basis for the [`MASTER_PLAN.md`](MASTER_PLAN.md) restructuring.

## 1. What the original guide already does well

- Establishes a **real, verified** medallion architecture (Bronze → Silver →
  Gold) on top of OpenLakehouse's actual implemented capabilities (Iceberg /
  Polaris / Trino / Spark / dbt-trino / Dagster / Superset / MLflow / Kafka /
  Debezium / Keycloak).
- Correctly identifies the Olist dataset's central modeling trap
  (`customer_id` is per-order, `customer_unique_id` is the real natural key)
  and designs a grain-correct two-fact-table star schema
  (`fact_orders` order-grain, `fact_order_items` order-item-grain).
- Gives one working SCD Type 2 example with **two** real implementations
  (hand-written Iceberg `MERGE INTO`, and a dbt snapshot), including the
  correct SCD2-aware temporal dimension join.
- Documents the dbt UI page and the `dbt` pipeline-node kind accurately,
  matching the real, verified implementation (not invented).
- Every chapter ends with a single 🧪 checkpoint — a good pattern, but only
  one scenario per chapter.

## 2. Structural problems (why "one long file" doesn't scale further)

- A single ~1,100-line Markdown file cannot grow to the depth requested
  (dozens of pages per subject, e.g. SCD2 or Pipeline Builder) without
  becoming unnavigable — no cross-linking, no independent versioning of a
  single subject, no way for a reader to jump straight to "SCD2 failure
  scenarios" without scrolling past unrelated material.
- Each chapter mixes *concept*, *one example*, and *one checkpoint* in a
  fixed shape — there's no room for the Business Context / Architecture /
  Basic / Intermediate / Advanced / Production-scenario progression this
  project now requires per subject.

## 3. Chapters that are correct but too shallow for the new bar

| Original chapter | Problem |
|---|---|
| Ch.2 (dataset & dimensional model) | One ERD + one key gotcha. No natural-key/surrogate-key/conformed/junk/degenerate-dimension taxonomy, no grain-validation method, no additive/semi-additive/non-additive measure classification. |
| Ch.6 (Bronze→Silver) | Gives the exact node sequence for 2 tables and a "follow the pattern" note for the rest. No duplicate/late-data/schema-change scenarios, no negative testing. |
| Ch.7 (dbt) | Correctly documents the real feature, but doesn't cover dbt tests in depth, incremental models are not discussed, and doesn't separate "current capability" from "you'd extend this yourself" clearly enough (the `snapshot` command gap is mentioned only in a callout). |
| Ch.9 (SCD2) | The single richest chapter in the original guide (two approaches, one real bug class called out) — still only one scenario (seller city change), no deletion handling, no out-of-order changes, no performance/concurrency discussion. |
| Ch.10 (facts) | Grain and SCD2-join logic are right, but additive vs. non-additive measures, accumulating snapshots, and referential-integrity testing as a *discipline* aren't covered. |
| Ch.11–12 (advanced pipelines) | Real, accurate `topo_sort` FIFO gotcha documented — but only 1 example pipeline; the request asks for 14 distinct pipeline scenarios. |
| Ch.13 (quality/lineage/ER) | Describes the 3 pages correctly but doesn't build a "quality framework" (completeness/uniqueness/validity/... taxonomy with per-rule failing examples). |
| Ch.15 (Superset) | 3 charts requested vs. the new ask for 6 full dashboards + a metrics catalog. |
| Ch.16 (MLflow) | Correct feature framing (late-delivery model) but skips train/test split discipline, data leakage discussion, model registry lifecycle, drift/retraining. |
| Ch.17 (streaming/CDC) | Correct architecture summary (Kafka + Debezium, both real, verified) but only 1 scenario; no watermarking/dedup/replay/DLQ/exactly-once discussion (some of this — the MERGE dedup bug — already exists as a lesson in repo memory but isn't in the guide). |
| Ch.19 (observability) | Correct list of real components (Prometheus/Grafana/Loki/OTel, all really deployed) but no SLI/SLO framing, no incident-response playbook shape. |
| Ch.22 (RBAC) | Correctly notes the ADMIN vs. `engineer.user` distinction exists — but the *actual, verified* RBAC surface in this codebase is narrow (role-gated: Python/PySpark code-node execution, Connections management, Compute kill actions, Admin page) and the guide doesn't say so explicitly; risk of over-claiming granular RBAC that doesn't exist. |
| Ch.23 (capstone) | A checklist, not an implementation project with phases and deliverables. |

## 4. Missing entirely from the original guide

- **Architecture Decision Records** (why Iceberg, why Bronze/Silver/Gold, why
  two fact tables, why Pipeline Builder *and* dbt both exist, etc.).
- **A troubleshooting knowledge base** per technology (Docker/Spark/Trino/
  Iceberg/dbt/Dagster/Kafka/Debezium/Superset/MLflow/Grafana/Loki/Gitea/
  Keycloak) — the guide has scattered "gotcha" callouts but no organized
  reference.
- **A test matrix** — the guide has per-chapter checkpoints but no
  consolidated ID'd test table.
- **Production incident scenarios** — none of the guide's checkpoints
  simulate "something is broken, go find out why."
- **Performance engineering** — not discussed at all (no small-files,
  skew, partitioning guidance for Iceberg/Trino/Spark in this project).
- **Security scenarios beyond "log in as a different user."**
- **A full project map** document tying every component's data flow
  together in one diagram with every arrow explained.
- **Interview / defense material.**
- **Negative testing as a first-class discipline** (a few gotchas exist as
  war stories, but they aren't organized as "break this on purpose, learn
  the failure signature").

## 5. Explicit non-negotiable constraint carried into every new document

The original guide is careful never to invent platform capabilities that
don't exist (e.g. it flags the dbt `snapshot` command gap as something the
*reader* would extend). This expansion **preserves that discipline**. Three
verified, hard platform limits that recur across many new documents and must
never be silently "upgraded" to sound more complete:

1. **Pipeline Builder `source`/`destination` types**: only `iceberg_table`
   (source) and `iceberg_bronze`/`iceberg_silver`/`iceberg_gold`
   (destination) actually compile. `minio`/`postgresql`/`kafka` destinations
   and the `schema` quality type are UI-selectable but raise `CompileError`
   at run time — this is a real, current gap, not a documentation typo.
2. **`dbt` pipeline node** only supports `run`/`test`/`build` — no
   `snapshot` command. Running `dbt snapshot` today requires a direct
   `docker compose exec dbt dbt snapshot` or a genuine code change to the
   node kind's allowed commands (a proposed extension, not current capability).
3. **RBAC is real but narrow**: role checks exist for (a) running a
   pipeline containing a `python`/`pyspark` code node, (b) Connections CRUD,
   (c) Compute kill actions, (d) the Admin page. There is **no** per-table /
   per-schema / per-pipeline row-level access control — "read-only BI
   analyst can't see Gold but can see Bronze" is a **proposed extension**,
   not something to document as already built.

Every module in this repository must tag material as **CURRENT PLATFORM
CAPABILITY**, **PROJECT IMPLEMENTATION** (what the Olist project itself
builds using the platform), or **PROPOSED / FUTURE EXTENSION** — see the
"Content classification" section of [`README.md`](README.md).
