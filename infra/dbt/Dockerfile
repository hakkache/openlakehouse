# dbt Core + the Trino adapter, for Phase 13 (dbt) per OPENLAKEHOUSE_SPEC.md.
# Also runs a small FastAPI wrapper (server.py) so the backend/Pipeline Builder can
# trigger `dbt run`/`test`/`build` over HTTP; ad-hoc `docker compose exec dbt dbt ...`
# commands still work fine alongside it (`exec` starts an independent process).
FROM python:3.11-slim

RUN pip install --no-cache-dir dbt-trino==1.10.3 fastapi==0.115.6 "uvicorn[standard]==0.32.1"

WORKDIR /usr/app/dbt
ENV DBT_PROFILES_DIR=/root/.dbt

COPY server.py /opt/dbt-runner/server.py

ENTRYPOINT ["uvicorn", "--app-dir", "/opt/dbt-runner", "server:app", "--host", "0.0.0.0", "--port", "8580"]
