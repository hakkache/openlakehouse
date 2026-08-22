# 02 — Building Dimensions

## Scenario 1 (Simple) — `dim_sellers` and `dim_date`

1. `dim_sellers`: surrogate key via `row_number()`, expect `3095` rows.
2. `dim_date`: generate via PySpark `sequence()` from `2016-01-01` to
   `2019-12-31` (`1461` rows); verify `2017-07-04` = Tuesday
   (`dayofweek`/`date_format` check).

## Scenario 2 (Medium) — `dim_customers` at the real correct grain

3. Build `dim_customers` grouped by `customer_unique_id` (**not**
   `customer_id`, per module 03's key quirk). **Expected result**:
   `96096` rows.

## The grain mistake, made and caught deliberately

4. Build a **wrong** version first: `GROUP BY customer_id`. **Expected
   (wrong) result**: `99441` rows — confirm this is the wrong number by
   comparing to the table in doc 01. Fix it by regrouping on
   `customer_unique_id`, re-verify `96096`.

| Grouping column | Row count | Correct? |
|---|---|---|
| `customer_id` | 99,441 | ❌ |
| `customer_unique_id` | 96,096 | ✅ |

> 🧪 **Checkpoint**: `dim_sellers` (3,095), `dim_date` (1,461), and
> `dim_customers` (96,096, **not** 99,441) all built with exact real row
> counts.

## Next document

[`03-building-facts.md`](03-building-facts.md).
