# 21 — Reference Cheatsheet

**Content type: REFERENCE.** Commands, SQL patterns, and troubleshooting
consolidated from every module.

## Commands

```powershell
# Boot / status
docker compose --profile full up -d --build
docker compose ps
docker compose logs --tail=50 <service>
docker network inspect openlakehouse-net

# dbt
docker compose exec dbt dbt run --select <model> --project-dir dbt_project --profiles-dir profiles
docker compose exec dbt dbt test --project-dir dbt_project --profiles-dir profiles
docker compose exec dbt dbt build --select +<model> --project-dir dbt_project --profiles-dir profiles
docker compose exec dbt dbt snapshot --project-dir dbt_project --profiles-dir profiles
docker compose exec dbt dbt source freshness --project-dir dbt_project --profiles-dir profiles

# Kafka
docker compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic orders --from-beginning --max-messages 5

# Ollama
docker compose exec ollama ollama list
```

## Real service ports (verify against your own `docker-compose.yml`)

| Service | Typical port |
|---|---|
| Frontend/App (via Traefik) | `80` |
| Keycloak | check compose |
| Trino UI | `8080` |
| Spark master UI | `8081` |
| Dagster | `3001` |
| Jupyter | `8888` |
| Superset | `8088` |
| MLflow | `5000` |
| Gitea | `3002` |
| Prometheus | `9090` |
| Grafana | `3000` |

## Real Olist ground-truth numbers (from module 03 — use to sanity-check every later step)

| Fact | Value |
|---|---|
| `olist_customers` / `olist_orders` rows | 99,441 each |
| `olist_order_items` rows | 112,650 |
| `olist_order_payments` rows | 103,886 |
| `olist_order_reviews` rows | 104,162 (contains real duplicate `review_id`s) |
| `olist_products` rows | 32,951 |
| `olist_sellers` rows | 3,095 |
| `olist_geolocation` rows | 1,000,163 |
| `product_category_name_translation` rows | 71 |
| Distinct `customer_unique_id` | 96,096 (≠ 99,441 `customer_id`) |
| Date range | ~2016-09-04 to 2018-10-17 |

## Recurring SQL patterns

**Dedupe latest event per key before MERGE** (the single most important
pattern in this guide — see modules 08 and 14):
```sql
WITH ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY <key> ORDER BY <offset/recency> DESC) AS rn
  FROM staged_events
)
SELECT * FROM ranked WHERE rn = 1;
```

**Never inner-join optional relationships** (orders may have 0 payments/items):
```sql
LEFT JOIN payments p ON p.order_id = o.order_id
-- then COALESCE(sum(p.value), 0)
```

**Referential integrity check**:
```sql
SELECT count(*) FROM fact f
LEFT JOIN dim d ON f.key = d.key
WHERE d.key IS NULL;  -- expect 0
```

**Temporal (SCD2-correct) join**:
```sql
JOIN dim_scd2 d ON fact.key = d.key
 AND fact.event_date >= d.valid_from AND fact.event_date < d.valid_to
```

## Glossary

- **Bronze/Silver/Gold**: medallion architecture tiers (module 01).
- **`mode: sql` vs `mode: advanced`**: Pipeline Builder's two compiler
  engines (module 06).
- **`run_key` dedup**: Dagster sensor mechanism preventing duplicate
  scheduled runs (module 09).
- **SCD1 vs SCD2**: overwrite vs. versioned-history dimension updates
  (module 08).
- **`REPLICA IDENTITY FULL`**: Postgres setting required for Debezium to
  capture full before/after row images (module 14).

## Troubleshooting index (jump to the relevant module)

| Symptom | See module |
|---|---|
| Pipeline node "SKIPPED" unexpectedly | 06 (fail-fast), 10 (quality gates) |
| Wrong/duplicate rows after a MERGE | 08, 14 (multi-event MERGE bug) |
| Dashboard numbers don't match a manual query | 11 (lineage), 20 (incident drill 2) |
| Streaming job reports 0 rows unexpectedly | 14 (stale checkpoint) |
| `403` on an action | 16 (RBAC) |
| Connection/Compute page shows nothing | 18 |
| Assistant gives a wrong/generic answer | 19 |

---

This concludes the Olist end-to-end guided project. Return to
[`00-README.md`](00-README.md) for the full document map.
