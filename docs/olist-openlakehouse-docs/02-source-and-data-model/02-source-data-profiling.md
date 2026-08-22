# 02 — Source Data Profiling

**Content type: PROJECT IMPLEMENTATION** (concrete profiling queries/
approach for this dataset, run against Bronze once ingested).

## Purpose

Establish the profiling steps every Bronze table should go through before
Silver transformation logic is written, so quality-gate thresholds
(`03-source-data-quality.md`) and cleaning rules (`04-silver-
transformation/`) are evidence-based, not guessed.

## Profiling checklist (per Bronze table)

1. **Row count** — via Spark `.count()` in the ingestion notebook, cross-
   checked against the reference counts in `01-olist-dataset.md`.
2. **Null rate per column** —
   ```python
   from pyspark.sql import functions as F
   df.select([F.count(F.when(F.col(c).isNull(), c)).alias(c) for c in df.columns]).show()
   ```
3. **Distinct-value / cardinality check on the intended natural key** —
   confirms whether a column is actually unique before relying on it as a
   dimension/fact key (this is exactly how the `customer_id` vs.
   `customer_unique_id` distinction is *proven*, not just asserted, in
   `01-olist-dataset.md`):
   ```python
   df.select("customer_id").distinct().count()          # == 99,441
   df.select("customer_unique_id").distinct().count()    # < 99,441 — proves repeats exist
   ```
4. **Categorical value inventory** — e.g. `order_status`'s 8 real values,
   `payment_type`'s 5 real values (including the `not_defined` catch-all) —
   confirmed via `df.groupBy(col).count().orderBy(F.desc("count")).show()`.
5. **Date range sanity** — `MIN`/`MAX` of every timestamp column; Olist's
   real data spans **2016-09 through 2018-10** (order purchase dates) —
   any date outside this range in later synthetic/test data (e.g.
   `21-production-scenarios/`) should be treated as intentionally
   injected test data, not a real-data surprise.
6. **Referential completeness spot-check** — e.g. what fraction of
   `order_items.product_id` values have no matching `products.product_id`
   row (Olist's real data has a small number of orphaned product/seller
   references — a real, expected characteristic of this dataset, not an
   ingestion bug — see `03-source-data-quality.md`).

## Real profiling findings for this dataset (from prior verified runs)

- `order_status = 'delivered'` accounts for the large majority of rows;
  `canceled`/`unavailable`/`processing`/etc. are meaningfully rarer —
  worth stratifying quality-gate thresholds so a normal ~3% cancellation
  rate isn't mistaken for a Silver-layer defect.
- A real subset of delivered orders have a **null**
  `order_delivered_customer_date` despite `order_status = 'delivered'` —
  a genuine source-data quality issue (not an ingestion artifact) that
  must be explicitly handled (documented in
  `03-source-data-quality.md` and exercised as a null-handling test case
  in `20-testing/`).
- `review_comment_message`/`review_comment_title` are frequently null
  (many reviews are score-only, no free text) — expected, not a defect.

## Next document

[`03-source-data-quality.md`](03-source-data-quality.md).
