# 05 — Customer Dashboard

**Content type: PROJECT IMPLEMENTATION.**

## Hands-On Walkthrough — customer-centric metrics

1. **Chart**: dataset `dim_customers`, viz **Big Number**, metric
   `COUNT(DISTINCT customer_unique_id)`. **Expected result**: `96096` —
   matches the real distinct-customer fact established since
   [`07-dimensional-modeling/04-customer-dimension.md`](../07-dimensional-modeling/04-customer-dimension.md).
2. **Chart**: dataset joining `fact_orders` to `dim_customers`, viz
   **Bar Chart**, group by `customer_state`, metric `COUNT(DISTINCT
   customer_unique_id)`. Name it `Customers by State`.
3. **Chart**: repeat-purchase analysis — a real SQL-based virtual
   dataset:
   ```sql
   SELECT customer_unique_id, count(DISTINCT order_id) AS order_count
   FROM iceberg.gold.fact_orders f JOIN iceberg.gold.dim_customers d
     ON f.customer_key = d.customer_key
   GROUP BY customer_unique_id
   ```
   Register this as a Superset **virtual dataset** ("SQL" dataset type),
   then build a **Histogram** chart on `order_count`. **Expected result**:
   heavily skewed toward `1` — a real, well-known characteristic of this
   dataset (most Olist customers order exactly once).
4. Assemble into a `Customer Insights` dashboard.

## The real business insight this surfaces

The order-count histogram from step 3 is a genuine, unprompted discovery
you can make yourself: this dataset has very low repeat-purchase rate —
directly relevant to
[`13-machine-learning/`](../13-machine-learning/)'s later churn-related
work, and a real, non-trivial finding worth calling out to a business
stakeholder, not a manufactured demo talking point.

> 🧪 **Checkpoint**: your histogram of orders-per-customer shows the real
> heavy skew toward single-order customers, computed from your own
> virtual dataset query.

## Next document

[`06-logistics-dashboard.md`](06-logistics-dashboard.md).
