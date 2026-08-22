# 02 — Virtual Datasets and SQL Lab

## Scenario 3 (Medium) — a chart built on a virtual (SQL) dataset

1. **SQL Lab** → run a query joining `fact_orders` + `dim_customers`
   grouping by customer state; **Save as dataset**.
2. Build a **Bar Chart**: top 10 states by order count. **Expected
   result**: matches a manual `GROUP BY` query run directly in Trino
   (cross-check the numbers).

## Physical dataset vs. virtual (SQL) dataset

| Dataset type | Source | When to use |
|---|---|---|
| Physical | one real table directly | simple, single-table charts |
| Virtual (SQL) | a saved SQL query | joins, aggregations, anything a single table can't express |

> 🧪 **Checkpoint**: your bar chart's top-state numbers exactly match a
> manual Trino query against the same real data.

## Next document

[`03-kpis-and-time-comparison.md`](03-kpis-and-time-comparison.md).
