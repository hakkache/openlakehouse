# 01 — Capabilities

## Scenario 1 (Simple) — general SQL/pipeline-authoring help

1. Ask the assistant to help write a generic SQL aggregation query (no
   reference to your actual schema) — e.g. "write a SQL query to compute
   month-over-month percent change." **Expected result**: a genuinely
   correct, generic SQL pattern — this class of question, with no
   dependency on your real schema, is where it's strongest.

| Good use case | Why it works well |
|---|---|
| Generic SQL pattern help | No schema-awareness required |
| Explaining a Trino/dbt/Spark concept | General knowledge, not data-specific |
| Drafting boilerplate pipeline node configs | Structural, not data-dependent |

> 🧪 **Checkpoint**: got 1 genuinely correct, directly-usable generic SQL
> answer with no schema-specific claims involved.

## Next document

[`02-limitations-and-gaps.md`](02-limitations-and-gaps.md).
