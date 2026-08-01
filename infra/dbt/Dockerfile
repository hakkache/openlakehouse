# dbt Core + the Trino adapter, for Phase 13 (dbt) per OPENLAKEHOUSE_SPEC.md.
# Runs as a long-lived idle container; `dbt run`/`dbt test`/`dbt docs generate`
# are invoked via `docker exec`, same pattern as the spark-master container's
# one-off `spark-submit` jobs.
FROM python:3.11-slim

RUN pip install --no-cache-dir dbt-trino==1.10.3

WORKDIR /usr/app/dbt
ENV DBT_PROFILES_DIR=/root/.dbt

ENTRYPOINT ["tail", "-f", "/dev/null"]
