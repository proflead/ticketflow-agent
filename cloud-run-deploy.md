# Cloud Run Deployment

Use this deployment flow for the current TicketFlow Agent repo.

The current recommended production shape is one Cloud Run service named `ticketflow` with two containers:
- `backend` on port `8080` as the public ingress container
- `mcp` as a sidecar container reached internally over `http://localhost:8001/mcp`

This avoids exposing the MCP service publicly while keeping backend and MCP traffic inside the same Cloud Run service.

## 1. Set variables

```bash
export PROJECT_ID="eco-composition-349414"
export REGION="asia-southeast1"
export REPOSITORY="ticketflow"
export SERVICE_NAME="ticketflow"
export DB_INSTANCE="ticketflow-db"
export DB_NAME="ticketflow"
export DB_USER="ticketflow"
export DB_PASS="TicketflowDemo2026!"
export SERVICE_ACCOUNT_EMAIL="ticketflow-runner@$PROJECT_ID.iam.gserviceaccount.com"
```

## 2. Select project

```bash
gcloud config set project "$PROJECT_ID"
```

## 3. Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  aiplatform.googleapis.com
```

## 4. Create Artifact Registry

```bash
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="TicketFlow container images"
```

## 5. Create Cloud SQL

```bash
gcloud sql instances create "$DB_INSTANCE" \
  --database-version=POSTGRES_16 \
  --edition=ENTERPRISE \
  --cpu=1 \
  --memory=3840MiB \
  --region="$REGION"

gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE"

gcloud sql users create "$DB_USER" \
  --instance="$DB_INSTANCE" \
  --password="$DB_PASS"
```

## 6. Create the Cloud Run service account

```bash
gcloud iam service-accounts create ticketflow-runner \
  --display-name="TicketFlow Cloud Run"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
  --role="roles/aiplatform.user"
```

## 7. Build and deploy

Run from the repo root:

```bash
./scripts/deploy_cloudrun.sh
```

The script:
- builds the backend image
- builds the MCP image
- renders the multi-container Cloud Run manifest
- deploys the `ticketflow` service
- grants public access to the service URL

Current deploy defaults:
- `GOOGLE_GENAI_USE_VERTEXAI=true`
- `GOOGLE_CLOUD_LOCATION=global`
- `GEMINI_MODEL=gemini-2.5-flash`
- `ENABLE_HEURISTIC_FALLBACK=true`

Override them in the shell before deploy if needed.

## 8. Run database migrations

Get the Cloud SQL connection name:

```bash
export INSTANCE_CONNECTION_NAME="$(gcloud sql instances describe "$DB_INSTANCE" --project="$PROJECT_ID" --format='value(connectionName)')"
```

Download and start Cloud SQL Auth Proxy:

```bash
curl -fL --retry 3 -o cloud-sql-proxy \
  https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.19.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy
./cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" --port 5432
```

In a second shell:

```bash
export DATABASE_URL="postgresql+psycopg://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME"
python -m pip install -r backend/requirements.txt
python -m alembic upgrade head
```

## 9. Verify the deployed service

```bash
export APP_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format='value(status.url)')"
curl "$APP_URL/health"
```

Expected response:

```json
{"status":"ok","service":"ticketflow-api"}
```

## 10. Run a workflow test

```bash
curl -X POST "$APP_URL/api/workflows/run" \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Customer John Doe john@example.com cannot log in and needs follow-up today"}'
```

Check:
- `status`
- `engine_mode`
- `summary`
- `errors`

If the app falls back unexpectedly, inspect logs:

```bash
gcloud run services logs read "$SERVICE_NAME" --region "$REGION" --limit 200
```
