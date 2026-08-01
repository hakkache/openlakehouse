-- Phase 12 (CDC) demo schema: run once against the real `openlakehouse` Postgres
-- database before registering the Debezium connector (the shared postgres
-- container's data volume already existed from earlier phases, so this is not
-- picked up automatically via docker-entrypoint-initdb.d).
--
-- Apply with:
--   docker exec -i openlakehouse-postgres psql -U openlakehouse -d openlakehouse < infra/debezium/init-cdc-schema.sql

CREATE SCHEMA IF NOT EXISTS cdc;

CREATE TABLE IF NOT EXISTS cdc.customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cdc.orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES cdc.customers(id),
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Debezium's pgoutput plugin requires REPLICA IDENTITY FULL to capture the
-- full "before" image on UPDATE/DELETE (the default REPLICA IDENTITY DEFAULT
-- only includes the primary key, which is enough for DELETE but not for
-- reconstructing a full "before" row on UPDATE).
ALTER TABLE cdc.customers REPLICA IDENTITY FULL;
ALTER TABLE cdc.orders REPLICA IDENTITY FULL;
