# OpenLakehouse — The Complete FIFA World Cup 2026 End-to-End Guide

> **How to use this guide**: this is a maximally-detailed walkthrough of
> **every functionality OpenLakehouse offers**, taught through one real
> dataset. It is written so you can follow it top to bottom with nothing
> else open except your browser and a terminal — every button, every
> config field, every expected result, and every "why does this matter"
> explanation is spelled out. Each major feature gets its own numbered
> chapter with: **what it is**, **why it exists**, **how it works
> internally**, a **step-by-step walkthrough**, a **diagram**, and a
> **🧪 verification test** proving the feature is real (backed by a live
> service), not a mock.
>
> This guide does not assume you've read any other OpenLakehouse document.
> Start at Part 1 and work straight through, or jump to any part below —
> each part states what (if anything) it depends on from earlier parts.

## Why this guide is split into files

The guide covers 25 chapters + 2 appendices — too much for one comfortable
document. It's split into **14 parts**, each a self-contained Markdown file
in this folder, grouped by related functionality so you can read (or
reference) one topic at a time without scrolling through unrelated
material. Every part links back here and to its neighbors.

## Table of contents

| Part | File | Chapters | What it covers |
|---|---|---|---|
| 1 | [01-orientation-setup-and-dataset.md](01-orientation-setup-and-dataset.md) | 0–2 | What OpenLakehouse is, environment setup & access matrix, the dataset and medallion architecture |
| 2 | [02-loading-and-exploring-data.md](02-loading-and-exploring-data.md) | 3–5 | Loading data with Jupyter + PySpark, Catalog & Data Explorer, SQL Editor and ad-hoc PySpark Code |
| 3 | [03-pipeline-builder-fundamentals.md](03-pipeline-builder-fundamentals.md) | 6–7 | No-Code Pipeline Builder fundamentals, building Bronze → Silver (quality gates in depth) |
| 4 | [04-gold-pipelines.md](04-gold-pipelines.md) | 8 | All 10 Gold pipelines — every transform and quality type the compiler supports |
| 5 | [05-quality-lineage-and-er-diagram.md](05-quality-lineage-and-er-diagram.md) | 9–11 | Data Quality dashboard, Lineage graph, ER Diagram |
| 6 | [06-advanced-pipeline-engine-fundamentals.md](06-advanced-pipeline-engine-fundamentals.md) | 12 (intro–12.3) | The advanced pipeline execution engine's mental model, RBAC, and full node-type reference |
| 7 | [07-advanced-pipeline-project-pipelines.md](07-advanced-pipeline-project-pipelines.md) | 12.4–12.8 | 5 real project pipelines — dynamic scouting reports, live FX enrichment, one-click orchestration, a mixed basic+advanced milestone alert, and a stateful team health scorecard |
| 8 | [08-advanced-pipeline-execution-rules-and-bugs.md](08-advanced-pipeline-execution-rules-and-bugs.md) | 12.9–12.11 | The topo_sort execution-order rule, real bugs found and fixed, builder behavior specifics |
| 9 | [09-orchestration-and-bi-dashboards.md](09-orchestration-and-bi-dashboards.md) | 13–14 | Orchestration with Dagster (Jobs page), BI dashboards with Superset |
| 10 | [10-ml-and-version-control.md](10-ml-and-version-control.md) | 15–16 | Machine learning with MLflow, version control with Gitea |
| 11 | [11-observability-and-streaming.md](11-observability-and-streaming.md) | 17–18 | Observability (Prometheus/Grafana/Loki), streaming (Kafka) and CDC (Debezium) |
| 12 | [12-platform-management-and-rbac.md](12-platform-management-and-rbac.md) | 19–23 | Connections management, Compute monitoring, AI Assistant, Platform Health, RBAC/roles/Admin |
| 13 | [13-testing-matrix-and-troubleshooting.md](13-testing-matrix-and-troubleshooting.md) | 24–25 | Full functionality test matrix, troubleshooting and gotchas appendix |
| 14 | [14-appendices.md](14-appendices.md) | A–B | Complete architecture diagram, what you built |

Start here: **[Part 1 — Orientation, Setup & the Dataset →](01-orientation-setup-and-dataset.md)**
