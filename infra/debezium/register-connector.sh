#!/bin/sh
# Registers the OpenLakehouse Postgres CDC connector against the real
# Debezium/Kafka Connect REST API. Idempotent: a 409 (already exists) is
# treated as success so this can safely be re-run.
set -e

CONNECT_URL="${CONNECT_URL:-http://debezium-connect:8083}"

echo "Waiting for Kafka Connect REST API at ${CONNECT_URL}..."
until curl -sf "${CONNECT_URL}/connectors" > /dev/null; do
  sleep 2
done

echo "Registering openlakehouse-postgres-cdc connector..."
HTTP_CODE=$(curl -sS -o /tmp/register-response.json -w "%{http_code}" \
  -X POST "${CONNECT_URL}/connectors" \
  -H "Content-Type: application/json" \
  -d @/postgres-connector.json)

echo "Response (HTTP ${HTTP_CODE}):"
cat /tmp/register-response.json

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
  echo "Connector registered (or already existed)."
  touch /tmp/connector-registered-done
  # Keep the container alive so `depends_on: condition: service_healthy`
  # consumers (and `docker ps`) can observe the healthcheck passing.
  tail -f /dev/null
else
  echo "Failed to register connector (HTTP ${HTTP_CODE})."
  exit 1
fi
