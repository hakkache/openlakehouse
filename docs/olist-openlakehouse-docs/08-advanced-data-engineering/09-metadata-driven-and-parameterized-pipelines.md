# 09 — Metadata-Driven and Parameterized Pipelines

**Content type: PROJECT IMPLEMENTATION.** Combines
[`05-pipeline-builder/13-reusable-pipelines.md`](../05-pipeline-builder/13-reusable-pipelines.md)'s
sub-pipeline pattern with a driving metadata table, so one pipeline
definition can process all 9 Olist source tables without 9 separately
hand-built pipelines.

## Hands-On Walkthrough — build a driving metadata table

1. In **SQL Editor** (or Jupyter), create a small config table:
   ```sql
   CREATE TABLE iceberg.gold.pipeline_config (
       table_name varchar, key_column varchar, schema_layer varchar
   ) WITH (format = 'PARQUET');
   INSERT INTO iceberg.gold.pipeline_config VALUES
   ('olist_orders', 'order_id', 'silver'),
   ('olist_customers', 'customer_id', 'silver'),
   ('olist_sellers', 'seller_id', 'silver'),
   ('olist_products', 'product_id', 'silver'),
   ('olist_order_items', 'order_item_id', 'silver');
   ```
2. Build one Pipeline Builder pipeline, `metadata_driven_qc`:
   - **variable** node, `type = from_query`,
     `query = SELECT array_agg(table_name) FROM iceberg.gold.pipeline_config`,
     `name = tables_to_check` (returns a real list, driven entirely by
     the metadata table's *current* contents).
   - **control** node, `type = for_each`, `variable = tables_to_check`,
     `body_node_ids = [<a code:sql node running a not_null check
     parameterized by {{item}}>]`.
3. Run it. **Expected result**: the run detail page shows 5 iterations
   (one per row in `pipeline_config`), each checking a different real
   table — the exact same mechanism as
   [`05-pipeline-builder/07-control-flow.md`](../05-pipeline-builder/07-control-flow.md)'s
   `for_each` walkthrough, but now driven by a **data-driven list**
   (queried from a real table) instead of a hardcoded literal list.
4. **Prove it's genuinely metadata-driven**: add a 6th row to
   `pipeline_config` for `olist_reviews`/`review_id`, re-run the pipeline
   *without changing any node config*. **Expected result**: now 6
   iterations run — the pipeline definition itself never changed, only
   the driving metadata table did.

## Why this matters at scale

This is the real technique that lets a platform team support dozens or
hundreds of source tables without maintaining a hand-built pipeline per
table — one well-tested "process any table" pipeline definition, driven
entirely by rows in a config table that business/data teams can extend
without touching pipeline code at all.

> 🧪 **Checkpoint**: you added one new row to a metadata table and
> watched an unmodified pipeline automatically process one more table —
> real proof of metadata-driven behavior, not a relabeled static list.

## Next module

[`09-orchestration/01-dagster-fundamentals.md`](../09-orchestration/01-dagster-fundamentals.md).
