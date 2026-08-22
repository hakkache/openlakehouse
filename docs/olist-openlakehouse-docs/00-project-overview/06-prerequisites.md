# 06 — Prerequisites & Access Matrix

**Content type: CURRENT PLATFORM CAPABILITY** (every URL/credential below
is a real, verified default from this repository's `docker-compose.yml`).

## Purpose

Get a working OpenLakehouse stack running and know exactly how to reach
every component before touching any Olist-specific work.

## Bring the stack up

```powershell
docker compose --profile full up -d --build
docker compose ps
```

Wait until everything shows `Up`/`healthy`. First boot pulls large images
(Ollama's model pull alone is several GB) and can take several minutes.
Two containers are *expected* to show non-`healthy`/non-`running(0)`
states and are not bugs: `redis-exporter` reports "unhealthy" due to a
cosmetic baked-in healthcheck issue in its own image (the exporter itself
works fine), and `openmetadata-migrate` is a one-shot migration container
that legitimately `Exited(0)` after doing its job.

## Access matrix

| Service | URL | Login | Traefik-routed? |
|---|---|---|---|
| OpenLakehouse app | http://localhost | `admin.user` / `openlakehouse` (ADMIN) or `engineer.user` / `openlakehouse` (DATA_ENGINEER) | Yes (port 80) |
| Jupyter | http://localhost:8888/jupyter/?token=openlakehouse | token: `openlakehouse` | No |
| Apache Superset | http://localhost:8088 | `admin` / `openlakehouse_dev_password` | No |
| MLflow | http://localhost:5000 | no auth | No |
| Dagster | http://localhost:3001 | no auth | No |
| Gitea | http://localhost:3010 | `olh-admin` / `openlakehouse_dev_password` | No |
| Grafana | http://localhost:3300 | `admin` / `openlakehouse_dev_password` | No |
| OpenMetadata | http://localhost:8585 | `admin@open-metadata.org` / `admin` | No |
| Keycloak token endpoint | http://localhost:8081/realms/openlakehouse/protocol/openid-connect/token | client_id `openlakehouse-web` | N/A |

> **Why so many admin UIs aren't Traefik-routed**: this is a real, current
> platform limitation (documented in `IMPLEMENTATION_STATUS.md` across
> multiple phases), not an error in this table — always browse the
> OpenLakehouse app itself via `http://localhost` (the frontend's own dev
> port / direct container port does **not** proxy `/api` writes and will
> 405 on POSTs).

## The dataset

This project uses the real Kaggle "Brazilian E-Commerce Public Dataset by
Olist" (9 CSVs): `olist_customers_dataset.csv`, `olist_orders_dataset.csv`,
`olist_order_items_dataset.csv`, `olist_order_payments_dataset.csv`,
`olist_order_reviews_dataset.csv`, `olist_products_dataset.csv`,
`olist_sellers_dataset.csv`, `olist_geolocation_dataset.csv`,
`product_category_name_translation.csv`. Download from Kaggle and keep
them outside the repository (this project does not redistribute the data).

Verified real row counts after ingestion (see
`03-bronze-ingestion/02-jupyter-pyspark-ingestion.md` for the exact
notebook): customers 99,441 · orders 99,441 · order_items 112,650 ·
order_payments 103,886 · order_reviews 104,162 · products 32,951 · sellers
3,095 · category_translation 71 · geolocation ~1,000,163.

> 🧪 **Gotcha**: `order_reviews`'s raw CSV has a few
> `review_comment_message` values containing embedded newlines inside
> quoted fields — a naive `(line count) - 1` estimate overcounts by a
> couple of rows versus Spark's real CSV parser. Trust Spark's `.count()`.

## Skills assumed

- Basic SQL (joins, aggregates, window functions).
- Basic Python/PySpark (DataFrame API).
- Basic Docker Compose usage (`up`, `ps`, `logs`, `exec`).
- No prior dbt or Kimball dimensional modeling experience is assumed — both
  are taught from fundamentals in `06-dbt/` and `07-dimensional-modeling/`.

## Next document

[`07-learning-roadmap.md`](07-learning-roadmap.md).
