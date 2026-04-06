#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID or run 'gcloud config set project <id>' first.}"
REGION="${REGION:-asia-southeast1}"
REPOSITORY="${REPOSITORY:-ticketflow}"
SERVICE_NAME="${SERVICE_NAME:-ticketflow}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-ticketflow-api}"
MCP_SERVICE_NAME="${MCP_SERVICE_NAME:-ticketflow-mcp}"
DB_INSTANCE="${DB_INSTANCE:?Set DB_INSTANCE.}"
DB_NAME="${DB_NAME:-ticketflow}"
DB_USER="${DB_USER:-ticketflow}"
DB_PASS="${DB_PASS:?Set DB_PASS.}"
TAG="${TAG:-$(date +%Y%m%d-%H%M%S)}"
GOOGLE_GENAI_USE_VERTEXAI="${GOOGLE_GENAI_USE_VERTEXAI:-true}"
GOOGLE_CLOUD_LOCATION="${GOOGLE_CLOUD_LOCATION:-global}"
GEMINI_MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
ENABLE_HEURISTIC_FALLBACK="${ENABLE_HEURISTIC_FALLBACK:-true}"
CORS_ORIGINS="${CORS_ORIGINS:-*}"
SERVICE_ACCOUNT_NAME="${SERVICE_ACCOUNT_NAME:-ticketflow-runner}"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_EMAIL:-${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com}"

BACKEND_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${BACKEND_SERVICE_NAME}:${TAG}"
MCP_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${MCP_SERVICE_NAME}:${TAG}"

INSTANCE_CONNECTION_NAME="$(
  gcloud sql instances describe "${DB_INSTANCE}" \
    --project "${PROJECT_ID}" \
    --format='value(connectionName)'
)"
INSTANCE_CONNECTION_NAME="${INSTANCE_CONNECTION_NAME:?Could not resolve Cloud SQL connection name.}"

DATABASE_URL="postgresql+psycopg://${DB_USER}:${DB_PASS}@/${DB_NAME}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}"

echo "Building backend image: ${BACKEND_IMAGE}"
gcloud builds submit "${ROOT_DIR}" \
  --project "${PROJECT_ID}" \
  --config "${ROOT_DIR}/cloudbuild.api.yaml" \
  --substitutions "_REGION=${REGION},_REPOSITORY=${REPOSITORY},_SERVICE_NAME=${BACKEND_SERVICE_NAME},_TAG=${TAG}"

echo "Building MCP image: ${MCP_IMAGE}"
gcloud builds submit "${ROOT_DIR}" \
  --project "${PROJECT_ID}" \
  --config "${ROOT_DIR}/cloudbuild.mcp.yaml" \
  --substitutions "_REGION=${REGION},_REPOSITORY=${REPOSITORY},_SERVICE_NAME=${MCP_SERVICE_NAME},_TAG=${TAG}"

TMP_YAML="$(mktemp)"
trap 'rm -f "${TMP_YAML}"' EXIT

export PROJECT_ID
export REGION
export SERVICE_NAME
export SERVICE_ACCOUNT_EMAIL
export INSTANCE_CONNECTION_NAME
export BACKEND_IMAGE
export MCP_IMAGE
export DATABASE_URL
export CORS_ORIGINS
export GOOGLE_GENAI_USE_VERTEXAI
export GOOGLE_CLOUD_LOCATION
export GEMINI_MODEL
export ENABLE_HEURISTIC_FALLBACK

envsubst < "${ROOT_DIR}/cloudrun.ticketflow.yaml.tmpl" > "${TMP_YAML}"

echo "Deploying Cloud Run service: ${SERVICE_NAME}"
gcloud run services replace "${TMP_YAML}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}"

echo "Allowing public access to ${SERVICE_NAME}"
gcloud run services add-iam-policy-binding "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --member="allUsers" \
  --role="roles/run.invoker" >/dev/null

echo
echo "Deployment complete."
echo "Service URL:"
gcloud run services describe "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format='value(status.url)'
