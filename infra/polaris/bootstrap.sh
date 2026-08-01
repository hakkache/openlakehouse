#!/bin/sh
# Bootstraps the "lakehouse" Iceberg REST catalog in Apache Polaris, backed by
# MinIO (S3-compatible storage). Idempotent: if the catalog already exists,
# the create call fails harmlessly and the script continues to (re)apply the
# grant, which is safe to repeat.
set -e

POLARIS_URL="${POLARIS_URL:-http://polaris:8181}"
CLIENT_ID="${CLIENT_ID:-root}"
CLIENT_SECRET="${CLIENT_SECRET:?CLIENT_SECRET is required}"
CATALOG_NAME="${CATALOG_NAME:-lakehouse}"
STORAGE_LOCATION="${STORAGE_LOCATION:-s3://lakehouse/warehouse}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
AWS_REGION_FOR_CATALOG="${AWS_REGION_FOR_CATALOG:-us-east-1}"

echo "Requesting OAuth2 token from Polaris at ${POLARIS_URL}..."
TOKEN_RESPONSE=$(curl -sS --fail-with-body \
  -X POST "${POLARIS_URL}/api/catalog/v1/oauth/tokens" \
  -d "grant_type=client_credentials" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "scope=PRINCIPAL_ROLE:ALL")

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to obtain access token. Response: $TOKEN_RESPONSE"
  exit 1
fi
echo "Obtained access token."

echo "Creating catalog '${CATALOG_NAME}' (base location ${STORAGE_LOCATION})..."
CREATE_PAYLOAD=$(cat <<EOF
{
  "catalog": {
    "name": "${CATALOG_NAME}",
    "type": "INTERNAL",
    "readOnly": false,
    "properties": {
      "default-base-location": "${STORAGE_LOCATION}",
      "polaris.config.drop-with-purge.enabled": "true"
    },
    "storageConfigInfo": {
      "storageType": "S3",
      "endpoint": "${MINIO_ENDPOINT}",
      "endpointInternal": "${MINIO_ENDPOINT}",
      "pathStyleAccess": true,
      "region": "${AWS_REGION_FOR_CATALOG}"
    }
  }
}
EOF
)

CREATE_STATUS=$(curl -sS -o /tmp/create_catalog_response.json -w "%{http_code}" \
  -X POST "${POLARIS_URL}/api/management/v1/catalogs" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${CREATE_PAYLOAD}")

if [ "$CREATE_STATUS" = "200" ] || [ "$CREATE_STATUS" = "201" ]; then
  echo "Catalog '${CATALOG_NAME}' created."
elif [ "$CREATE_STATUS" = "409" ]; then
  echo "Catalog '${CATALOG_NAME}' already exists, ensuring drop-with-purge is enabled..."
  CURRENT=$(curl -sS --fail-with-body \
    -H "Authorization: Bearer ${TOKEN}" \
    "${POLARIS_URL}/api/management/v1/catalogs/${CATALOG_NAME}")
  ENTITY_VERSION=$(echo "$CURRENT" | grep -o '"entityVersion":[0-9]*' | cut -d':' -f2)
  DEFAULT_BASE_LOCATION=$(echo "$CURRENT" | grep -o '"default-base-location":"[^"]*' | cut -d'"' -f4)
  UPDATE_PAYLOAD=$(cat <<EOF
{
  "currentEntityVersion": ${ENTITY_VERSION},
  "properties": {
    "default-base-location": "${DEFAULT_BASE_LOCATION:-$STORAGE_LOCATION}",
    "polaris.config.drop-with-purge.enabled": "true"
  }
}
EOF
)
  curl -sS --fail-with-body \
    -X PUT "${POLARIS_URL}/api/management/v1/catalogs/${CATALOG_NAME}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${UPDATE_PAYLOAD}" > /tmp/update_catalog_response.json || {
      echo "Catalog property update failed:"
      cat /tmp/update_catalog_response.json
      exit 1
    }
else
  echo "Unexpected status ${CREATE_STATUS} creating catalog:"
  cat /tmp/create_catalog_response.json
  exit 1
fi

echo "Granting CATALOG_MANAGE_CONTENT to catalog_admin role on '${CATALOG_NAME}'..."
curl -sS --fail-with-body \
  -X PUT "${POLARIS_URL}/api/management/v1/catalogs/${CATALOG_NAME}/catalog-roles/catalog_admin/grants" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"type":"catalog","privilege":"CATALOG_MANAGE_CONTENT"}' \
  > /tmp/grant_response.json || {
    echo "Grant request failed:"
    cat /tmp/grant_response.json
    exit 1
  }

echo "Polaris bootstrap complete."
touch /tmp/polaris-bootstrap-done
tail -f /dev/null
