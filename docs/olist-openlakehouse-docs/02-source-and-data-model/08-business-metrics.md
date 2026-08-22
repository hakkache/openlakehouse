# 08 — Business Metrics Catalog

**Content type: PROJECT IMPLEMENTATION.**

## Purpose

Define, precisely, every business metric this project will report on later
(BI dashboards in [`12-bi-and-analytics/`](../12-bi-and-analytics/), ML
features in [`13-machine-learning/`](../13-machine-learning/)) — as a named
catalog with an exact formula, the Gold table it depends on, and its
additivity classification. Ambiguous metric definitions ("revenue" meaning
different things in different dashboards) are one of the most common
real-world data-platform trust failures — this catalog exists to prevent
that from the start.

## Metrics catalog

| Metric | Formula | Additivity | Depends on |
|---|---|---|---|
| **Gross revenue** | `SUM(fact_order_items.price)` | Fully additive (any dimension) | `fact_order_items` |
| **Freight revenue** | `SUM(fact_order_items.freight_value)` | Fully additive | `fact_order_items` |
| **Order count** | `COUNT(DISTINCT fact_orders.order_key)` | Additive only via `COUNT DISTINCT`, **not** plain `COUNT(*)` on `fact_order_items` (would over-count orders with multiple items) | `fact_orders` |
| **Average order value (AOV)** | `SUM(total_payment_value) / COUNT(DISTINCT order_key)` | **Non-additive** — never `AVG()` a pre-aggregated average across dimensions; always recompute the ratio at query time | `fact_orders` |
| **Late delivery rate** | `SUM(CAST(is_late AS int)) / COUNT(*)` over delivered orders only | **Semi-additive** — additive across most dimensions, but must filter to `order_delivered_customer_date IS NOT NULL` first (undelivered orders have no "late" answer yet) | `fact_orders` |
| **Average review score** | `AVG(order_reviews.review_score)` per order/seller/product | **Non-additive** — never sum-then-divide across a pre-aggregated grain; always recompute from row-level scores | `order_reviews` (not yet in the Gold star schema — see callout below) |
| **Repeat customer rate** | `COUNT(DISTINCT customer_unique_id WHERE order_count > 1) / COUNT(DISTINCT customer_unique_id)` | Non-additive (a ratio of two counts) | `dim_customers` + `fact_orders` |

> **Callout — `order_reviews` is not yet in this project's star schema.**
> The core 24-chapter guide's Gold model (Chapter 2) does not include a
> `fact_reviews` table. Review-score metrics above are flagged
> **PROPOSED EXTENSION**: build a `fact_reviews` (grain: one row per
> review, FK to `fact_orders.order_key`) yourself using the same Pipeline
> Builder / dbt patterns taught in this project, if you want review-based
> dashboards in [`12-bi-and-analytics/`](../12-bi-and-analytics/). This
> document deliberately does not pretend it already exists.

## Additivity — why it matters (the #1 BI-tool footgun)

A **non-additive** measure that gets `SUM()`-ed by a dashboard tool across
a dimension it shouldn't be summed across produces a *plausible-looking but
wrong* number — the most dangerous kind of BI bug because nothing errors,
nobody notices immediately, and the wrong number gets presented in a
business review. AOV is the textbook example: if a dashboard pre-computes
AOV per day and then a user adds a "sum this column" total row across 30
days, that "monthly AOV" is **not** the real monthly AOV — it must be
recomputed from `SUM(total_payment_value)/COUNT(DISTINCT order_key)` over
the whole 30-day window, not averaged-of-averages.

## Hands-On Walkthrough — prove the additivity trap with real numbers

You'll only be able to run this against the real Gold tables once they
exist (after [`07-dimensional-modeling/`](../07-dimensional-modeling/)) —
this is a forward-reference checkpoint to come back and run then. It's
included here, in the metrics catalog, so you know exactly what "prove it"
looks like before you get there.

1. Once `fact_orders` exists, open **SQL Editor** (`/sql`) and run the
   *wrong* way (average-of-daily-averages):
   ```sql
   WITH daily AS (
     SELECT d.full_date,
            AVG(f.total_payment_value) AS daily_aov
     FROM iceberg.gold.fact_orders f
     JOIN iceberg.gold.dim_date d ON f.order_date_key = d.date_key
     GROUP BY d.full_date
   )
   SELECT AVG(daily_aov) AS wrong_monthly_aov FROM daily
   WHERE full_date BETWEEN DATE '2017-01-01' AND DATE '2017-01-31';
   ```
2. Then run the *correct* way (recompute the ratio over the whole window):
   ```sql
   SELECT SUM(total_payment_value) / COUNT(DISTINCT order_key) AS correct_monthly_aov
   FROM iceberg.gold.fact_orders f
   JOIN iceberg.gold.dim_date d ON f.order_date_key = d.date_key
   WHERE d.full_date BETWEEN DATE '2017-01-01' AND DATE '2017-01-31';
   ```
3. **Expected result**: the two numbers will differ (typically by a few
   percent, more if daily order volume is uneven) — this difference *is*
   the bug this document warns about, made concrete with your own data.

> 🧪 **Checkpoint** (deferred until Gold exists): both queries return
> results and you can explain, in one sentence, *why* they differ. If you
> can't yet, re-read the additivity section above before building any
> Superset chart in [`12-bi-and-analytics/`](../12-bi-and-analytics/) that
> touches AOV.

## Next document

Module 02 is complete. Continue to
[`03-bronze-ingestion/01-ingestion-architecture.md`](../03-bronze-ingestion/01-ingestion-architecture.md)
— this is where you start building on the real platform.
