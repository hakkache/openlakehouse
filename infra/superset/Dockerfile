FROM apache/superset:4.1.1

USER root
RUN pip install --no-cache-dir trino sqlalchemy-trino psycopg2-binary

COPY infra/superset/superset_config.py /app/pythonpath/superset_config.py
COPY infra/superset/entrypoint.sh /entrypoint-openlakehouse.sh
RUN chmod +x /entrypoint-openlakehouse.sh

USER superset

ENTRYPOINT ["/entrypoint-openlakehouse.sh"]
