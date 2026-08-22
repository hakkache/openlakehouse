# 01 — Fundamentals: The Two Real Engines

**Content type: CURRENT PLATFORM CAPABILITY, verified from
`pipeline_compiler.py` and `pipeline_executor.py`.**

## `mode: sql` — the simple engine

If a pipeline's nodes are only `source`/`transform`/`quality`/
`destination`, the backend compiles the **entire pipeline into a single
Trino SQL statement**: one `WITH` CTE per node, chained by a topological
sort of the edges, ending in one `INSERT`/`CREATE TABLE AS` into the
destination. This means:

- **One network round-trip to Trino** for the whole pipeline, however
  many transform nodes it has.
- **No intermediate materialization** — every node is a CTE, not a real
  table, until the final destination write.
- Fast, but "all or nothing": you get one query plan, one set of query
  stats, one place to look for errors.

## `mode: advanced` — the step-by-step engine

Adding **any** `variable`, `code`, `control`, `api_ingestion`,
`sub_pipeline`, or `dbt` node switches the whole pipeline to
`pipeline_executor.py`. Real consequences:

- Nodes execute **one at a time, in topological order**.
- Every `source`/`transform` node's result is materialized as a **real
  Trino view** under a scratch schema (`iceberg.tmp` or similar,
  `view_scope`-namespaced per run) — not just a CTE — so later nodes
  (including inside `for_each` loops) can reference it by name.
- **Fail-fast**: the moment one node fails, all remaining nodes are
  marked `SKIPPED` and the run stops. There is no partial-continue.
- Each node's `NodeRunStatus` records its own `status`, `row_count`,
  `duration_ms`, and (for loop bodies) `iteration_index`/`parent_node_id`
  — giving you a genuine per-node execution trace, unlike `mode: sql`'s
  single combined result.

## Hands-On Walkthrough — see both engines fire, side by side

1. Build **Pipeline A**: `source(iceberg_table, bronze.olist_sellers)` →
   `select(columns=[seller_id, seller_city])` →
   `destination(iceberg_silver, table=sellers_simple)`. Save, **Compile**.
   **Expected result**: the compile response shows `"mode": "sql"` and a
   single `full_sql` string containing nested `WITH` clauses.
2. Build **Pipeline B**: identical nodes, plus one extra `variable` node
   (`type=literal`, `name=x`, `value=1`) with no edges connecting it to
   anything. Save, **Compile**. **Expected result**: `"mode": "advanced"`
   — the mere *presence* of a variable node anywhere in the graph is
   enough to switch engines, even if nothing consumes its output.
3. Run both. **Expected result**: Pipeline A's run detail shows one
   combined execution entry; Pipeline B's run detail shows 4 separate
   per-node rows (source, select, variable, destination), each with its
   own `duration_ms`.

## Why this matters when you design a pipeline

- If your whole pipeline is genuinely just "read → transform → gate →
  write," keep it node-kind-restricted to `source`/`transform`/`quality`/
  `destination` — you get the faster, simpler `mode: sql` engine and a
  single query plan you can `EXPLAIN` directly in Trino.
- The instant you need templated values, conditional logic, loops,
  external HTTP calls, calling another pipeline, or driving dbt — you're
  in `mode: advanced` territory, and should design for its step-by-step,
  fail-fast semantics (see [`13-error-handling-and-fail-fast.md`](13-error-handling-and-fail-fast.md)).

> 🧪 **Checkpoint**: you've triggered both `mode: sql` and
> `mode: advanced` yourself, and can explain in one sentence what single
> factor decides which engine runs a given pipeline.

## Next document

[`02-source-and-destination-nodes.md`](02-source-and-destination-nodes.md).
