# 01 — ML Use Case: Late Delivery Prediction

**Content type: PROJECT IMPLEMENTATION**, following the same real pattern
as the existing `infra/mlflow/train_churn.py` (Trino → pandas → sklearn →
MLflow tracking + registry), adapted to a genuinely useful Olist use case:
predicting whether an order will arrive late **at the moment it's
placed** (before delivery happens), using only information available at
purchase time.

## Why this is a real, valid ML use case (and what would be leakage)

The label is `is_late` (module 04's derived column). The features must
be things known **at order time**, not after delivery — this constraint
is the entire point of doc 02
([`02-feature-engineering-and-leakage.md`](02-feature-engineering-and-leakage.md)).
Valid candidate features: `customer_state`, `seller_state`, product
category, `price`, `freight_value`, day-of-week of purchase, distance
proxy (state-to-state pairing). **Invalid** (leakage): anything derived
from `order_delivered_customer_date` itself, since that's only known
after the fact you're trying to predict.

## Hands-On Walkthrough — confirm the real label distribution first

1. In **SQL Editor**:
   ```sql
   SELECT is_late, count(*), avg(count(*)) OVER () AS avg_row
   FROM iceberg.gold.fact_orders WHERE is_late IS NOT NULL GROUP BY is_late;
   ```
   **Expected result**: a real class imbalance (late orders are the
   minority class in this dataset) — note down your exact counts; this
   matters for choosing a real evaluation metric in doc 03 (accuracy
   alone would be misleading with this imbalance — F1/precision/recall,
   same metrics `train_churn.py` already logs, are the right choice).
2. Confirm how many orders have `is_late IS NULL` (undelivered):
   ```sql
   SELECT count(*) FROM iceberg.gold.fact_orders WHERE is_late IS NULL;
   ```
   These rows **must be excluded** from training (no ground truth yet) —
   note the real count for your own dataset.

> 🧪 **Checkpoint**: you have the real class balance for `is_late` and
> the real count of excluded undelivered orders, both required facts for
> the rest of this module.

## Next document

[`02-feature-engineering-and-leakage.md`](02-feature-engineering-and-leakage.md).
