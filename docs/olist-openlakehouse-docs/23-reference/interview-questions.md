# Interview Questions

**Content type: REFERENCE.** Real questions grounded in this specific
platform's actual behavior — answerable only by someone who has genuinely
worked through this documentation set, not generic data-engineering
trivia.

1. **Why does Pipeline Builder switch from "sql" to "advanced" execution
   mode?** — Any `variable`/`code`/`control`/`api_ingestion`/
   `sub_pipeline`/`dbt` node forces the step-by-step executor instead of
   the single compiled CTE statement.
2. **Why is a `deduplicate` node alone not sufficient to fix the CDC
   MERGE bug?** — Because the bug happens at MERGE time against a batch
   with 2+ events per key; you need the dedupe **inside** the MERGE
   source subquery, keyed on a real recency column (offset), not just
   anywhere in the pipeline.
3. **Why does `dim_customers` have fewer rows than `olist_customers`?**
   — Grain difference: `customer_unique_id` (real person) vs.
   `customer_id` (one per order-account row).
4. **What's the real difference between Type 1 and Type 2 SCD in this
   project's actual implementation?** — Type 1 (`dim_sellers`) overwrites
   in place; Type 2 (`dim_sellers_scd2`) preserves history via
   `valid_from`/`valid_to`/`is_current`, built either by hand-written
   2-step MERGE or dbt snapshot.
5. **Why can't lineage show the Bronze ingestion step?** — Lineage is
   derived purely from saved Pipeline Builder JSON definitions; Bronze
   ingestion is done via Jupyter/Spark directly, with no corresponding
   pipeline definition.
6. **Why is `class_weight="balanced"` used in the late-delivery model?**
   — The real label distribution is imbalanced (late orders are the
   minority class); plain accuracy would be misleading.
7. **Why does disabling a Keycloak user not immediately revoke API
   access?** — Already-issued JWTs remain valid until their own
   expiration; disabling only blocks new token issuance.
8. **Why must money columns use `decimal`, not `double`?** — Floating-
   point imprecision (`0.1 + 0.2 != 0.3` demonstrated directly in Trino).
9. **What's the real, current limitation of Dagster orchestration for
   multi-pipeline dependencies?** — No native multi-op job DAG exists;
   ordering is achieved either via manual sequential triggering or
   `sub_pipeline:call` chaining within one pipeline.
10. **Why does the AI Assistant give generic (not schema-aware) answers?**
    — It's a small local Ollama model with only a system-prompt persona,
    no real RAG/tool-calling pipeline connecting it to this project's
    actual schema/lineage/docs.

## This closes the full 24-module documentation set.

Return to [`00-project-overview/`](../00-project-overview/) or the
[`PROGRESS.md`](../PROGRESS.md) tracker for the complete module index.
