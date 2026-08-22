# FAQ

**Content type: REFERENCE.**

**Q: Why does Bronze ingestion use Jupyter/Spark instead of Pipeline
Builder?**
A: Because Pipeline Builder's real compiled source-node types only
support `iceberg_table` (per
[`05-pipeline-builder/02-basic-nodes.md`](../05-pipeline-builder/02-basic-nodes.md))
— CSV/raw-file ingestion isn't a compiled source type, so the initial
raw→Bronze load genuinely requires Spark directly.

**Q: Why doesn't Bronze ingestion show up in the Lineage page?**
A: Lineage is derived purely from saved Pipeline Builder definitions
(module 11 doc 01) — a Jupyter/Spark write has no `PipelineDefinition` to
derive an edge from. This is a real, documented gap, not a bug.

**Q: Why does `0.1 + 0.2` not equal `0.3` in some SQL queries?**
A: Classic floating-point (`double`) imprecision — always use
`decimal(p,s)` for money columns, verified directly in
[`04-silver-transformation/06-schema-enforcement.md`](../04-silver-transformation/06-schema-enforcement.md).

**Q: Why did my MERGE INTO create duplicate/wrong rows?**
A: You likely had 2+ events for the same key in one batch. MERGE
evaluates every source row against the pre-batch target snapshot, not
sequentially — dedupe first with `ROW_NUMBER()`. See
[`07-dimensional-modeling/12-scd2-failure-scenarios.md`](../07-dimensional-modeling/12-scd2-failure-scenarios.md).

**Q: Why is the AI Assistant's answer about my schema wrong/generic?**
A: It's a small, purely local Ollama model with no real RAG/tool-calling
connection to this project's actual schema — see
[`19-ai-assistant/01-ai-assistant.md`](../19-ai-assistant/01-ai-assistant.md).

**Q: Why does disabling a Keycloak user not immediately block API
access?**
A: Their existing JWT remains valid until its own `exp` claim passes —
disabling the account only stops *new* token issuance. See
[`21-production-scenarios/05-security-incidents.md`](../21-production-scenarios/05-security-incidents.md).

**Q: Why is `dim_customers` 96096 rows but `olist_customers` (raw) is
99441?**
A: `dim_customers` is built at the `customer_unique_id` grain (real
customer), while the raw table has one row per `customer_id` (one per
order-account-instance) — see
[`07-dimensional-modeling/04-customer-dimension.md`](../07-dimensional-modeling/04-customer-dimension.md).

## Next reference document

[`project-map.md`](project-map.md).
