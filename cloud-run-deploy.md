# Cloud Run Deployment

Use this deployment flow for the current TicketFlow Agent repo.

The recommended production shape is one Cloud Run service named `ticketflow`
with two containers:
- `backend` on port `8080`
- `mcp` on port `8001`

The backend calls MCP over `http://localhost:8001/mcp`, so MCP does not need
to be exposed as a separate public Cloud Run service.

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
```

## 2. Select project

```bash
gcloud config set project "$PROJECT_ID"
```

## 3. Enable APIs

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

## 6. Get Cloud SQL connection name

```bash
export INSTANCE_CONNECTION_NAME=$(gcloud sql instances describe "$DB_INSTANCE" --project="$PROJECT_ID" --format="value(connectionName)")
echo "$INSTANCE_CONNECTION_NAME"
```

## 7. Create service account

```bash
gcloud iam service-accounts create ticketflow-runner \
  --display-name="TicketFlow Cloud Run"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:ticketflow-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:ticketflow-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

## 8. Create service account

```bash
gcloud iam service-accounts create ticketflow-runner \
  --display-name="TicketFlow Cloud Run"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:ticketflow-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:ticketflow-runner@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

## 9. Build and deploy

Run from repo root:

```bash
cd /home/proflead/Documents/ticketflow-agent
export SERVICE_ACCOUNT_EMAIL="ticketflow-runner@$PROJECT_ID.iam.gserviceaccount.com"
./scripts/deploy_cloudrun.sh
```

## 11. Run migrations

Start Cloud SQL Auth Proxy:

```bash
curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.19.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy
./cloud-sql-proxy "$INSTANCE_CONNECTION_NAME" --port 5432
```

Open a second terminal:

```bash
cd /home/proflead/Documents/ticketflow-agent
source .venv/bin/activate
export DATABASE_URL="postgresql+psycopg://$DB_USER:$DB_PASS@127.0.0.1:5432/$DB_NAME"
python -m alembic upgrade head
```

## 12. Get your public submission URL

```bash
gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format="value(status.url)"
```

## 13. Verify

```bash
export APP_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format="value(status.url)")
curl "$APP_URL/health"
```

Open `APP_URL` in the browser and test the workflow.
