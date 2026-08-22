# 15 — End-to-End Scenarios: Simple to Very Complex

**Content type: PROJECT WORK.** Ten full pipelines, each combining
multiple real node kinds from modules 02-13, ordered by increasing
complexity. Build them in order — later ones reuse earlier ones' outputs.

## Scenario 1 (Trivial) — 1:1 copy

`source(bronze.olist_sellers)` → `destination(iceberg_silver,
sellers_copy)`. **Mode**: `sql`. **Expected**: `3095` rows, identical
schema.

## Scenario 2 (Simple) — clean and type 3 columns

`source(bronze.olist_order_items)` → `select` (7 real columns) →
`cast` (`price`/`freight_value` → `decimal(10,2)`) →
`destination(iceberg_silver, order_items_typed)`. **Mode**: `sql`.
**Expected**: `112650` rows, confirmed `decimal` types via `DESCRIBE`.

## Scenario 3 (Simple→Medium) — dedupe + quality gate

`source(bronze.olist_order_reviews)` → `deduplicate(review_id)` →
`not_null(review_id, order_id)` → `unique(review_id)` →
`destination(iceberg_silver, reviews_clean)`. **Mode**: `sql`.
**Expected**: `count(*) = count(DISTINCT review_id)`, both quality nodes
report `0` violations.

## Scenario 4 (Medium) — join + aggregate + derived column

`source(silver.order_items_typed)` join `source(silver.orders_renamed)`
→ `aggregate` (monthly revenue) → `derived_column`
(`revenue_per_order = total_revenue / order_count`) →
`destination(iceberg_gold, monthly_revenue_summary)`. **Mode**: `sql`.
**Expected**: real monthly figures, cross-checked manually for one month.

## Scenario 5 (Medium→Complex) — a live-data-driven quality gate (first advanced pipeline)

`variable(from_query, name=null_pk_count, query="SELECT count(*) FROM
iceberg.silver.orders_renamed WHERE order_id IS NULL")` →
`control(if, condition="null_pk_count == 0",
false_skip_nodes=["dest"])` → `destination(iceberg_gold,
orders_gate_passed)` (`id="dest"`). **Mode**: `advanced` (the `variable`
node forces it). **Expected**: destination runs (real `null_pk_count`
is `0`). **Negative test**: manually insert a fake `NULL` `order_id`
row into a **scratch copy** of the table first — confirm the gate now
blocks the write, then discard the scratch copy.

## Scenario 6 (Complex) — loop over tables, one dbt test per table

`variable(literal, name=tables, value=["stg_olist_orders",
"stg_olist_customers"])` → `control(for_each, items_variable="tables",
item_variable="tbl", body_node_ids=["dbt_test_node"])` →
`dbt(type="test", select="{{ tbl }}")` (`id="dbt_test_node"`). **Mode**:
`advanced`. **Expected**: 2 real dbt test runs, one per model, each
logged as a separate iteration in the run detail.

## Scenario 7 (Complex) — external enrichment + Spark aggregation

`variable(from_query, name=avg_price, query="SELECT avg(price) FROM
iceberg.silver.order_items_typed")` → `api_ingestion(rest_get,
url="https://api.frankfurter.app/latest?from=USD&to=BRL",
result_variable=fx)` → `code:pyspark` (compute
`avg_price * fx_rate_extracted_from_variables` using real Spark) →
`destination(iceberg_gold, avg_price_usd_equivalent)`. **Mode**:
`advanced`. **Expected**: a real cross-currency figure, verifiable by
hand-multiplying the two real numbers.

## Scenario 8 (Complex) — sub-pipeline composition, 2 levels deep

Reuse module 11's `qc_not_null_check` sub-pipeline, called from a
**mid-level** pipeline `qc_all_orders_checks` (which itself runs 2
different quality sub-pipelines via 2 `sub_pipeline` nodes), which is
in turn called from a top-level `daily_quality_report` pipeline.
**Mode**: `advanced`, all 3 levels. **Expected**: the top-level run
detail shows a real 3-level nested execution tree; reproduce module 11's
cyclic-call guard by attempting to have `qc_all_orders_checks` call
`daily_quality_report` (its own ancestor) — confirm the real error.

## Scenario 9 (Very complex) — the full Silver-to-Gold capstone pipeline

One pipeline combining, in order: 2 `source` nodes → 1 `join` → 1
`fill_null` (handling orders-without-payments) → 1 `derived_column`
(`is_late`) → 1 `variable(from_query)` computing the real late-delivery
rate → 1 `control(if)` gating on a sane rate range (e.g.
`0 <= late_rate <= 1`) → 1 `aggregate` (per-state summary) → 1
`window` (running total per state) → 1 `dbt(type="run")` refreshing a
dependent mart → 1 `destination(iceberg_gold)`. **Mode**: `advanced`.
**Expected**: a single real run touching **9 distinct node kinds** —
the practical ceiling of what one pipeline can express in this platform.

## Scenario 10 (Capstone) — schedule it and watch it run unattended

Take Scenario 9's pipeline, set a real cron `schedule` (module 09 of the
main guide), and let Dagster's `scheduled_pipelines_sensor` fire it
automatically at least once without any manual trigger. **Expected
result**: a real, unattended, multi-node-kind, advanced-mode pipeline
run appears in your run history with `executed_by = "dagster"` — the
complete proof that everything in this module composes into a real
production-style automated pipeline.

> 🧪 **Final Checkpoint for Module 06**: you've built and run all 10
> scenarios against real Olist data, and can point to at least one real
> pipeline run exercising each of the 10 node kinds from
> [`00-index.md`](00-index.md)'s inventory table.

## Back to module index

[`00-index.md`](00-index.md) — or continue the main guide at
[`../07-dbt-modeling/00-index.md`](../07-dbt-modeling/00-index.md).
