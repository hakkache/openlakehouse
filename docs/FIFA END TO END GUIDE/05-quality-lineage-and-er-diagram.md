# Part 5 — Data Quality, Lineage & ER Diagram

**[← Guide index](00-README.md)** · Part 5 of 14 · Previous: [Part 4 — The 10 Gold Pipelines](04-gold-pipelines.md) · Next: [Part 6 — Advanced Pipeline Engine: Fundamentals →](06-advanced-pipeline-engine-fundamentals.md)

---

## Chapter 9 — Data Quality dashboard

**Depends on:** [Part 3](03-pipeline-builder-fundamentals.md) Chapter 7, [Part 4](04-gold-pipelines.md) Chapter 8.

### 9.1 What this page shows and how it's computed

Open **Data Quality** (`/quality`). This is not a separate quality engine —
it's a dashboard *over* the same quality-node execution results already
recorded by every pipeline run in Chapters 7–8 (`GET /api/v1/pipelines/quality`
cross-references `PipelineNodeRun` rows against each pipeline's stored
definition to find quality-kind nodes). You'll see checks of **five
different types**, all passing (0 violations each, unless you trigger a
failure below):

| Pipeline | Node type | What it checks |
|---|---|---|
| `fifa_bronze_to_silver_appearances` | `not_null` | `player_id`/`match_id`/`team`/`position` never null |
| `fifa_bronze_to_silver_appearances` | `unique` | `(player_id, match_id)` has no duplicates |
| `fifa_bronze_to_silver_appearances` | `range` | `pass_accuracy` is between 0 and 1 |
| `fifa_gold_xg_overperformance` | `row_count` | source has **at least** 50,000 rows (bound check) |
| `fifa_gold_goalkeeper_performance` | `regex` | every `position` value matches the 4-value pattern |
| `fifa_gold_group_vs_knockout_comparison` | `freshness` | no `match_date` older than 90 days |

### 9.2 Trigger a real failure (optional but recommended)

**Scenario A — uniqueness violation:** in Jupyter, append a duplicate
`(player_id, match_id)` row:

```python
df.limit(1).writeTo("catalog.bronze.fifa_player_matches").append()
```

Re-run `fifa_bronze_to_silver_appearances`. The `unique` node now reports a
violation, the run status flips to `FAILED`, and the silver destination
node is **skipped** — quality gates really block downstream writes, they
don't just report. Remember to `DROP TABLE` and re-ingest a clean copy
afterwards.

**Scenario B — row_count bound violation:** temporarily edit §8.6's
`row_count` config to `{"min": 1000000}` (bronze only has 54,600
rows), re-run — the gate fails with `"Row count 54600 is below minimum
1000000"` and the gold destination is skipped. Set it back to `50000`
afterwards.

> 🧪 **Test it:** after either scenario, reload **Data Quality** — the
> failed check now shows a red/failed status and the overall quality score
> drops, live-reflecting the real run you just triggered.

---

## Chapter 10 — Lineage graph

**Depends on:** [Part 3](03-pipeline-builder-fundamentals.md) Chapter 7, [Part 4](04-gold-pipelines.md) Chapter 8.

### 10.1 What it is and how it's derived

Open **Lineage** (`/lineage`). Unlike a real metadata catalog with a
persistent lineage store, OpenLakehouse derives this **purely from your
saved pipeline definitions** — it walks backward from every destination
node through transform/quality passthrough nodes to find the source table
FQN(s) each destination ultimately reads from (`GET
/api/v1/pipelines/lineage` aggregates edges across every saved pipeline).
Only `iceberg_table` sources and `iceberg_bronze/silver/gold` destinations
resolve — matching the same real-SQL-only node types the compiler
implements.

### 10.2 What you should see, edge by edge

- `bronze.fifa_player_matches → silver.player_match_appearances` (§7),
  which fans out to `→ gold.top_scorers` (§8.1), `→ gold.position_benchmarks`
  (§8.3), `→ gold.top_scorer_per_team` (§8.4), `→ gold.goalkeeper_performance`
  (§8.7), `→ gold.group_vs_knockout_comparison`'s silver-independent path,
  and `→ gold.player_market_value` (§8.9, joined with a second bronze
  branch)
- `bronze.fifa_player_matches → gold.team_standings` (§8.2) and
  `→ gold.goals_by_stage` (§8.5) — read bronze directly
- `bronze.fifa_player_matches → gold.xg_overperformance` (§8.6) — reads
  bronze directly
- `bronze.fifa_player_matches → gold.group_vs_knockout_comparison` (§8.8) —
  **two** edges into the same gold table (both branches source the same
  bronze table)
- `bronze.fifa_player_matches → gold.player_market_value` (§8.9) — the
  second (bio/market-value) branch also reads bronze directly, alongside
  silver
- `silver.player_match_appearances → gold.physical_profile_by_position`
  (§8.10)

Notice bronze has **more distinct downstream fan-out** than silver in a
few places (§8.6, §8.8, §8.9's second branch) — a good visual reminder that
not every gold table has to route through silver; it's a per-mart choice
based on whether you need silver's quality gates/filter/derived column
first.

> 🧪 **Test it:** click any node in the graph — it should highlight only
> its direct upstream/downstream edges, letting you trace a single table's
> full lineage chain in isolation from the other 10 pipelines' edges.

---

## Chapter 11 — ER Diagram

**Depends on:** [Part 4](04-gold-pipelines.md) Chapter 8.

### 11.1 What it is, and its honest limitation

Open **ER Diagram** (`/er-diagram`). Pick catalog `iceberg`, schema `gold`.
Every gold table renders as a card listing its columns, with **best-effort
inferred relationship arrows** between tables whose columns look like
foreign keys — e.g. an `_id`-suffixed column matched (via naive
pluralization) against a same-named id column in another table.

**Be honest with yourself about what this is:** Iceberg/Trino do not store
real foreign-key metadata (nothing in this whole stack enforces referential
integrity at the storage layer). This page's relationships are a
**heuristic**, computed purely from column-name pattern matching — treat
the arrows as a helpful starting point for understanding your schema, never
as ground truth about real constraints.

> 🧪 **Test it:** switch schema from `gold` to `silver` or `bronze` — the
> diagram re-fetches and re-renders live from the real catalog metadata for
> whichever schema you pick, not a hardcoded gold-only view.

---

**[← Guide index](00-README.md)** · Part 5 of 14 · Previous: [Part 4 — The 10 Gold Pipelines](04-gold-pipelines.md) · Next: [Part 6 — Advanced Pipeline Engine: Fundamentals →](06-advanced-pipeline-engine-fundamentals.md)
