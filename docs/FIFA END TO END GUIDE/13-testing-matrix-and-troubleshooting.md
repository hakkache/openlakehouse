# Part 13 — Testing Matrix & Troubleshooting

**[← Guide index](00-README.md)** · Part 13 of 14 · Previous: [Part 12 — Platform Management, AI Assistant & RBAC](12-platform-management-and-rbac.md) · Next: [Part 14 — Appendices →](14-appendices.md)

---

## Chapter 24 — Full functionality test matrix

Use this as a single-page pass/fail checklist across everything in this
guide.

| # | Functionality | Part / Chapter | How to verify | Expected |
|---|---|---|---|---|
| 1 | CSV → Iceberg Bronze via Jupyter/Spark | [Part 2](02-loading-and-exploring-data.md) Ch. 3 | Spark Master UI Completed Applications | real app, 54,600 rows written |
| 2 | Catalog browsing | [Part 2](02-loading-and-exploring-data.md) Ch. 4 | `/catalog` tree | 71 columns, 54,600 rows |
| 3 | Data Explorer + right-click actions | [Part 2](02-loading-and-exploring-data.md) Ch. 4 | context menu row count | 54,600 |
| 4 | SQL editor (Trino) | [Part 2](02-loading-and-exploring-data.md) Ch. 5 | run exploratory queries | matches §5.1 expected values |
| 5 | PySpark Code mode | [Part 2](02-loading-and-exploring-data.md) Ch. 5 | run ad-hoc cell | real Spark job in Master UI |
| 6 | Basic pipeline (quality + filter + derive) | [Part 3](03-pipeline-builder-fundamentals.md) Ch. 7 | run, check Trino UI | 31,558 silver rows |
| 7 | All 14 transform types | [Part 4](04-gold-pipelines.md) Ch. 8 | 10 gold pipelines | row counts per §8.1–8.10 |
| 8 | All 6 quality types | [Part 4](04-gold-pipelines.md) Ch. 8 | quality nodes in pipelines | 0 violations (or triggered failure, §9.2) |
| 9 | Data Quality dashboard | [Part 5](05-quality-lineage-and-er-diagram.md) Ch. 9 | `/quality` | 5 check types, scored |
| 10 | Lineage graph | [Part 5](05-quality-lineage-and-er-diagram.md) Ch. 10 | `/lineage` | 11 pipelines' edges |
| 11 | ER Diagram | [Part 5](05-quality-lineage-and-er-diagram.md) Ch. 11 | `/er-diagram` | gold schema cards + inferred FKs |
| 12 | Advanced engine: variable/code/for_each — dynamic scouting report | [Part 7](07-advanced-pipeline-project-pipelines.md) §12.4 | run `fifa_adv_scouting_report` | `gold.scouting_report_dynamic` has 5 rows, "Iterated 5 item(s)..." |
| 13 | Advanced engine: control/if self-check + alert | [Part 7](07-advanced-pipeline-project-pipelines.md) §12.4 | shrink `LIMIT` to 4, re-run | "Condition evaluated to True", alert node runs with live count in its message |
| 14 | Advanced engine: api_ingestion + python — live FX enrichment | [Part 7](07-advanced-pipeline-project-pipelines.md) §12.5 | run `fifa_adv_market_value_usd_enrichment` | `gold.player_market_value_usd` populated at today's real EUR/USD rate |
| 15 | Advanced engine: sub_pipeline — master orchestration | [Part 7](07-advanced-pipeline-project-pipelines.md) §12.6 | run `fifa_master_orchestration` | all 11 `Sx` nodes report SUCCEEDED, in order |
| 16 | Advanced engine: mixed basic+advanced — milestone alert | [Part 7](07-advanced-pipeline-project-pipelines.md) §12.7 | run `fifa_adv_milestone_alert_pipeline` | `gold.top_scorer_milestones` written, then a real webhook POST fires/skips per threshold |
| 17 | Advanced engine: multi-step stateful loop body | [Part 7](07-advanced-pipeline-project-pipelines.md) §12.8 | run `fifa_adv_team_health_scorecard` | "Iterated 48 item(s)...", `team_classifications` has 48 accumulated entries |
| 18 | Dagster Jobs page | [Part 9](09-orchestration-and-bi-dashboards.md) Ch. 13 | trigger run, cross-check Dagster UI | same run ID in both |
| 19 | Dagster scheduling/sensor | [Part 9](09-orchestration-and-bi-dashboards.md) §13.3 | set cron a few min out | auto-run appears, no click |
| 20 | Superset dashboard | [Part 9](09-orchestration-and-bi-dashboards.md) Ch. 14 | 15 charts, 4 tabs, filters | cross-filtering works live |
| 21 | MLflow training | [Part 10](10-ml-and-version-control.md) Ch. 15 | 3 runs in one experiment | r2/mae metrics comparable |
| 22 | Gitea versioning | [Part 10](10-ml-and-version-control.md) Ch. 16 | push + clone | files round-trip |
| 23 | Grafana/Prometheus/Loki | [Part 11](11-observability-and-streaming.md) Ch. 17 | PromQL query | non-zero live rate |
| 24 | Kafka streaming | [Part 11](11-observability-and-streaming.md) §18.2 (1–2) | Trino row count | count increases after each run |
| 25 | Debezium CDC | [Part 11](11-observability-and-streaming.md) §18.2 (3–4) | Trino query after update | reflects the real change |
| 26 | Connections | [Part 12](12-platform-management-and-rbac.md) Ch. 19 | Test Connection (good + bad) | success and failure both real |
| 27 | Compute status + kill | [Part 12](12-platform-management-and-rbac.md) Ch. 20 | kill a kernel/app/query | disappears + audit log entry |
| 28 | AI Assistant | [Part 12](12-platform-management-and-rbac.md) Ch. 21 | ask a grounded question | reflects real data |
| 29 | Platform Health | [Part 12](12-platform-management-and-rbac.md) Ch. 22 | stop a dependency | flips to unhealthy |
| 30 | RBAC | [Part 12](12-platform-management-and-rbac.md) Ch. 23 | compare roles | 403s enforced server-side |

---

## Chapter 25 — Troubleshooting and gotchas appendix

A consolidated list of every gotcha called out inline above, for quick
reference:

- **Destinations are idempotent no-ops on re-run** ([Part 3](03-pipeline-builder-fundamentals.md) §7.2) — `DROP TABLE`
  first to force a rebuild.
- **`pivot` column aliases must be valid identifiers** ([Part 4](04-gold-pipelines.md) §8.5) — sanitize
  categorical values with `replace` first.
- **`freshness`/quality `column` config is raw SQL, not a bare column
  name** ([Part 4](04-gold-pipelines.md) §8.8) — cast a `VARCHAR` date column explicitly, and remember
  type errors only surface on **Run**, not dry-run **Compile**.
- **`union` is positional, not name-based** ([Part 4](04-gold-pipelines.md) §8.8) — force matching column
  order with `select` on each branch if needed.
- **`join`'s `on` clause must use `n_<node id>` aliases** ([Part 4](04-gold-pipelines.md) §8.9) — always
  the node's real id, never its label.
- **Mixing edge-connected and edge-free advanced nodes breaks execution
  order** ([Part 8](08-advanced-pipeline-execution-rules-and-bugs.md) §12.9) — the topo_sort gotcha; either keep advanced nodes on
  one single unbroken chain ([Part 7](07-advanced-pipeline-project-pipelines.md) §12.5, §12.6, §12.7), or draw zero edges among
  them and rely on node-creation order ([Part 7](07-advanced-pipeline-project-pipelines.md) §12.4, §12.8). Clear stray edges
  via a direct Postgres update if a saved pipeline gets stuck.
- **`literal` variables can never hold a real list** ([Part 6](06-advanced-pipeline-engine-fundamentals.md) §12.3) — use
  `from_query` with a Trino `ARRAY`-returning query instead.
- **`sub_pipeline`/`join`/`union` node ids have no UI lookup** ([Part 4](04-gold-pipelines.md) §8.9,
  [Part 6](06-advanced-pipeline-engine-fundamentals.md) §12.3) — use each node's **Copy ID** button, or query Postgres directly
  for another pipeline's UUID.
- **Running `python`/`pyspark` code (Explorer or pipeline node) requires
  `ADMIN`/`DATA_ENGINEER`** ([Part 2](02-loading-and-exploring-data.md) §5.2, [Part 8](08-advanced-pipeline-execution-rules-and-bugs.md) §12.11) — a `VIEWER`/`ANALYST` gets a
  real 403.
- **`sub_pipeline` always re-executes its target through the step-by-step
  engine**, even if that target is a pure basic pipeline that normally
  compiles to one SQL statement on its own ([Part 7](07-advanced-pipeline-project-pipelines.md) §12.6) — expect several small
  per-node Trino statements instead of one big CTE while it runs.
- **Advanced-pipeline runs leave permanent orphaned views in
  `iceberg.tmp`** ([Part 7](07-advanced-pipeline-project-pipelines.md) §12.6) — the engine never drops them; periodically
  `SHOW TABLES FROM iceberg.tmp` and drop old ones.
- **Tables created via a raw `code/sql` statement inside an advanced
  pipeline are invisible to the Lineage graph** ([Part 7](07-advanced-pipeline-project-pipelines.md) §12.4, [Part 5](05-quality-lineage-and-er-diagram.md) Ch. 10) —
  Lineage only derives edges from `source`/`destination`-kind nodes, not
  arbitrary SQL side effects.
- **Only `code`/`variable`/`api_ingestion` node configs get `{{var}}`
  templating** ([Part 7](07-advanced-pipeline-project-pipelines.md) §12.8) — a `transform`/`source`/`destination` node's config
  is compiled completely literally; route per-iteration values through a
  `code/sql`/`code/python` node instead.
- **A node referenced only in an `if` node's skip list — never via a real
  edge — has zero incoming edges and can run before that `if` even
  evaluates** ([Part 7](07-advanced-pipeline-project-pipelines.md) §12.7) — draw a real edge into it from the `if` (or from
  whatever should run immediately before it) whenever the whole graph
  still reduces to one unbroken chain.
- **Always access the app via `http://localhost` (Traefik), never the
  frontend's own dev port** ([Part 1](01-orientation-setup-and-dataset.md) Ch. 1) — direct-port POSTs fail with 405.
- **A full `docker compose down -v` wipes Superset's/other services' own
  metadata DBs** ([Part 9](09-orchestration-and-bi-dashboards.md) §14.1) — recreate the Trino connection if so.

---

**[← Guide index](00-README.md)** · Part 13 of 14 · Previous: [Part 12 — Platform Management, AI Assistant & RBAC](12-platform-management-and-rbac.md) · Next: [Part 14 — Appendices →](14-appendices.md)
