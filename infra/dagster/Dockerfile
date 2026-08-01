FROM python:3.11-slim

WORKDIR /opt/dagster/app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl \
    && rm -rf /var/lib/apt/lists/*

# Reuse the backend's own requirements so we can import app.* modules directly
# (pipeline models, compiler, and executor) instead of duplicating logic.
COPY backend/requirements.txt ./backend-requirements.txt
RUN pip install --no-cache-dir -r backend-requirements.txt

RUN pip install --no-cache-dir \
    dagster==1.8.13 \
    dagster-webserver==1.8.13 \
    dagster-postgres==0.24.13

COPY backend/app ./app
COPY infra/dagster/repository.py ./repository.py
COPY infra/dagster/dagster.yaml /opt/dagster/dagster_home/dagster.yaml
COPY infra/dagster/workspace.yaml /opt/dagster/dagster_home/workspace.yaml

ENV DAGSTER_HOME=/opt/dagster/dagster_home
ENV PYTHONPATH=/opt/dagster/app

EXPOSE 3000
