# 01 — Connecting and Your First Chart

## Scenario 1 (Simple) — connect and confirm separate auth

1. Open `http://localhost:8088` directly (not through the app's SSO
   flow). **Expected result**: Superset's **own native login form** —
   not a Keycloak redirect. Log in with its local admin credentials.
2. **Databases** → confirm a real Trino connection already exists
   (`sqlalchemy://trino://...@trino:8080/iceberg`), or add one pointing
   at `trino:8080` (the internal Docker service name — proving both
   containers share the network from module 01).

## Scenario 2 (Simple→Medium) — first real dataset and chart

3. **Datasets** → **+Dataset** → pick `iceberg.gold.mart_olist_order_summary`
   (built in module 07).
4. Build a **Time-series Line Chart**: X = month, Y = `sum(revenue)`.
   **Expected result**: a real trend line matching the true date range
   from module 03 (2016-09 to 2018-10).

| Step | Chart type | Expected result |
|---|---|---|
| First connection | — | Superset's own login, not SSO |
| First chart | Time-series line | trend line spanning 2016-09 to 2018-10 |

> 🧪 **Checkpoint**: confirmed Superset's separate local auth, and built
> 1 real chart matching the true real date range.

## Next document

[`02-virtual-datasets-and-sql-lab.md`](02-virtual-datasets-and-sql-lab.md).
