# 03 — Source Data Quality

**Content type: PROJECT IMPLEMENTATION** grounded in **CURRENT PLATFORM
CAPABILITY** (real quality-node types available in the Pipeline Builder).

## Purpose

Catalog the genuine data-quality issues present in the raw Olist dataset
and map each to the specific quality-gate node type that catches it in
this platform.

## Real quality issues found in this dataset (not hypothetical)

| Issue | Table | Detection | Gate (Pipeline Builder node type) |
|---|---|---|---|
| `order_delivered_customer_date` null despite `order_status='delivered'` | orders | profiling in `02-source-data-profiling.md` | `not_null` gate is **not** appropriate here (it's valid missing data, not a defect) — instead handle via an explicit Silver-layer `fill_null`/flag column, documented as a modeling decision, not a quality failure |
| Orphaned `product_id`/`seller_id` references in `order_items` | order_items | referential spot-check | no platform-native FK-existence quality node type exists today — enforced instead via a `join`-based Gold pipeline (inner join naturally drops orphans) or a dbt `relationships` test at the Silver→Gold boundary (see `06-dbt/06-testing.md`) |
| Embedded newlines in `review_comment_message` | order_reviews | naive line-count vs. Spark `.count()` mismatch | not a quality gate — a parsing correctness issue solved entirely by using Spark's real CSV parser, not string splitting |
| Duplicate rows possible on re-ingestion re-run | all Bronze tables | re-running the ingestion notebook without `createOrReplace()` | `deduplicate` transform node in Silver pipelines, keyed on the table's natural key |
| `customer_id` uniqueness ≠ `customer_unique_id` uniqueness | customers | cardinality check | `unique` quality gate on `customer_id` in Silver is valid; must NOT be mistakenly applied to `customer_unique_id` (which is intentionally non-unique per row until deduplicated in `dim_customers`) |

## The 4 real quality-gate node types (and what each actually validates)

- **`not_null`**: fails the pipeline if any row has a null in the
  specified column.
- **`unique`**: fails if the specified column (or column combination) has
  duplicate values.
- **`regex`**: fails if any value doesn't match a supplied pattern (e.g.
  validating `customer_zip_code_prefix` is numeric).
- **`schema`** *(UI-selectable, NOT implemented)*: selecting this in the
  Pipeline Builder UI compiles but raises `CompileError` at run time — a
  real, current platform gap. Do not use it; if schema validation is
  needed, enforce it via `cast` transform nodes (which fail loudly on
  incompatible casts) instead.

## Quality gate placement convention for this project

Every Silver destination pipeline gets at minimum `not_null` + `unique` on
its declared natural key (see the per-table key list in
`01-olist-dataset.md`). This is a project convention documented here and
enforced by code review of pipeline JSON exports, not a platform-enforced
rule.

## Next document

[`04-source-relationships.md`](04-source-relationships.md).
