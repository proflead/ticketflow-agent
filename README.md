# TicketFlow Agent

TicketFlow Agent is a hackathon-ready multi-agent AI system built with Google ADK, Gemini, MCP, FastAPI, React, and PostgreSQL. It demonstrates how a coordinator agent can decompose a productivity request, delegate work to specialist sub-agents, execute tools through a separate MCP service, persist structured data, and return a traceable workflow result through a real HTTP API.

## Project Overview
- Google ADK backend in Python
- Gemini model configuration through environment variables
- Coordinator agent plus `task_agent`, `calendar_agent`, and `notes_agent`
- Separate MCP tools service with database-backed tools
- PostgreSQL persistence for tasks, events, notes, and workflow runs
- FastAPI API with structured JSON responses
- Minimal React UI for demo use
- Google Cloud deployment path using Cloud Run and Cloud SQL

## Architecture
- `backend/`
  - FastAPI API
  - Google ADK agents
  - workflow orchestration
  - frontend static file serving in production
- `mcp_service/`
  - separate MCP server
  - tools: `create_task`, `list_tasks`, `create_event`, `list_events`, `add_note`, `search_notes`
- `shared/`
  - shared SQLAlchemy models and Pydantic schemas
- `frontend/`
  - Vite React UI
- `alembic/`
  - database migration

See [architecture.md](/home/proflead/Documents/ticketflow-agent/architecture.md) for the condensed design.

## Screenshots / Demo Placeholders
- Add a screenshot of the main prompt screen here
- Add a screenshot of a successful workflow run here
- Add a screenshot of the Google Cloud deployed app here

## Repo Structure
```text
ticketflow-agent/
├── alembic/
├── backend/
├── frontend/
├── mcp_service/
├── scripts/
├── shared/
├── .env.example
├── architecture.md
├── docker-compose.yml
└── README.md
```

## Environment Variables
Copy `.env.example` to `.env` and fill in the values you need.

Core variables:
- `DATABASE_URL`
- `MCP_SERVER_URL`
- `CORS_ORIGINS`
- `GEMINI_MODEL`
- `GOOGLE_API_KEY`
- `GOOGLE_GENAI_USE_VERTEXAI`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `ENABLE_HEURISTIC_FALLBACK`
- `VITE_API_BASE_URL`

Notes:
- Local development can use `GOOGLE_API_KEY`.
- Google Cloud can use an API key or Vertex AI-compatible environment setup.
- If Gemini credentials are missing and `ENABLE_HEURISTIC_FALLBACK=true`, the backend uses a narrow deterministic fallback so the stack can still be smoke-tested.

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker and Docker Compose
- A Gemini API key or Vertex AI credentials for full ADK execution

### 1. Start PostgreSQL
```bash
docker compose up -d postgres
```

### 2. Install Python dependencies
Backend:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

MCP service uses the same venv in local development:
```bash
pip install -r mcp_service/requirements.txt
```

### 3. Install frontend dependencies
```bash
cd frontend
npm install
cd ..
```

### 4. Configure environment
```bash
cp .env.example .env
```

Set at minimum:
```bash
DATABASE_URL=postgresql+psycopg://ticketflow:ticketflow@localhost:5432/ticketflow
MCP_SERVER_URL=http://localhost:8001/mcp
VITE_API_BASE_URL=http://localhost:8080
GOOGLE_API_KEY=your_api_key
```

### 5. Initialize the database
```bash
source .venv/bin/activate
export PYTHONPATH="$(pwd)/shared"
alembic upgrade head
```

Or use the helper:
```bash
./scripts/migrate.sh
```

### 6. Run the MCP service
```bash
source .venv/bin/activate
./scripts/run_local_mcp.sh
```

### 7. Run the backend
```bash
source .venv/bin/activate
./scripts/run_local_backend.sh
```

### 8. Run the frontend
```bash
cd frontend
npm run dev
```

Frontend URL:
- `http://localhost:5173`

Backend URL:
- `http://localhost:8080`

MCP service URL:
- `http://localhost:8001/mcp`

## Full Stack With Docker Compose
Start the services:
```bash
docker compose up --build
```

Run the migration from your local Python environment:
```bash
source .venv/bin/activate
export DATABASE_URL=postgresql+psycopg://ticketflow:ticketflow@localhost:5432/ticketflow
export PYTHONPATH="$(pwd)/shared"
alembic upgrade head
```

## How To Run The Backend
```bash
source .venv/bin/activate
./scripts/run_local_backend.sh
```

## How To Run The MCP Service
```bash
source .venv/bin/activate
./scripts/run_local_mcp.sh
```

## How To Run The Frontend
```bash
cd frontend
npm run dev
```

## API Endpoints
- `POST /api/workflows/run`
- `GET /api/state`
- `GET /health`

### Example curl Commands
Run a workflow:
```bash
curl -X POST http://localhost:8080/api/workflows/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a high-priority task for Friday'\''s client demo, block one hour tomorrow at 10 AM, and save note: bring pricing slides."
  }'
```

Fetch recent state:
```bash
curl http://localhost:8080/api/state
```

Health check:
```bash
curl http://localhost:8080/health
```

## Example User Prompts
- `Create a high-priority task for Friday's client demo, block one hour tomorrow at 10 AM, and save note: bring pricing slides.`
- `Save these meeting notes and create follow-up tasks: Action item: finalize onboarding checklist. Follow up with finance on discount approval.`
- `Show my open tasks and recent notes.`
- `Schedule a reminder and create a task from this support issue: Customer cannot access onboarding emails and needs a reply today.`

## Google Cloud Deployment

### Deployment Shape
- Cloud Run service 1: backend API plus built frontend
- Cloud Run service 2: MCP service
- Cloud SQL for PostgreSQL

### 1. Create or select a GCP project
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable required APIs
```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

If you plan to use Vertex AI auth flow, also enable:
```bash
gcloud services enable aiplatform.googleapis.com
```

### 3. Create Artifact Registry repository
```bash
gcloud artifacts repositories create ticketflow \
  --repository-format=docker \
  --location=us-central1
```

### 4. Create Cloud SQL PostgreSQL instance
```bash
gcloud sql instances create ticketflow-db \
  --database-version=POSTGRES_16 \
  --cpu=1 \
  --memory=3840MiB \
  --region=us-central1
```

Create database and user:
```bash
gcloud sql databases create ticketflow --instance=ticketflow-db
gcloud sql users create ticketflow --instance=ticketflow-db --password=CHANGE_ME
```

Fetch the Cloud SQL connection name:
```bash
gcloud sql instances describe ticketflow-db --format="value(connectionName)"
```

### 5. Create service accounts and IAM
Create a runtime service account:
```bash
gcloud iam service-accounts create ticketflow-run
```

Grant Cloud SQL access:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ticketflow-run@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

If using Vertex AI:
```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:ticketflow-run@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### 6. Build and deploy the MCP service
Build and push:
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/ticketflow/ticketflow-mcp .
```

Deploy:
```bash
gcloud run deploy ticketflow-mcp \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/ticketflow/ticketflow-mcp \
  --region us-central1 \
  --service-account ticketflow-run@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --no-allow-unauthenticated \
  --port 8001 \
  --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:ticketflow-db \
  --set-env-vars APP_ENV=production,DATABASE_URL='postgresql+psycopg://ticketflow:CHANGE_ME@/ticketflow?host=/cloudsql/YOUR_PROJECT_ID:us-central1:ticketflow-db'
```

Get the MCP service URL:
```bash
gcloud run services describe ticketflow-mcp --region us-central1 --format="value(status.url)"
```

### 7. Build and deploy the backend service
Build and push:
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/ticketflow/ticketflow-api .
```

Deploy:
```bash
gcloud run deploy ticketflow-api \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/ticketflow/ticketflow-api \
  --region us-central1 \
  --service-account ticketflow-run@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port 8080 \
  --add-cloudsql-instances YOUR_PROJECT_ID:us-central1:ticketflow-db \
  --set-env-vars APP_ENV=production,DATABASE_URL='postgresql+psycopg://ticketflow:CHANGE_ME@/ticketflow?host=/cloudsql/YOUR_PROJECT_ID:us-central1:ticketflow-db',MCP_SERVER_URL='https://TICKETFLOW_MCP_URL/mcp',CORS_ORIGINS='https://TICKETFLOW_API_URL',GEMINI_MODEL='gemini-2.0-flash',GOOGLE_API_KEY='YOUR_API_KEY'
```

If using Vertex AI instead of API key:
```bash
--set-env-vars APP_ENV=production,DATABASE_URL='postgresql+psycopg://ticketflow:CHANGE_ME@/ticketflow?host=/cloudsql/YOUR_PROJECT_ID:us-central1:ticketflow-db',MCP_SERVER_URL='https://TICKETFLOW_MCP_URL/mcp',CORS_ORIGINS='https://TICKETFLOW_API_URL',GEMINI_MODEL='gemini-2.0-flash',GOOGLE_GENAI_USE_VERTEXAI=true,GOOGLE_CLOUD_PROJECT='YOUR_PROJECT_ID',GOOGLE_CLOUD_LOCATION='us-central1'
```

### 8. Run database migration
Option 1: run locally through the Cloud SQL Auth Proxy or a temporary authorized network.

Option 2: run a one-off Cloud Run job or container with the same image and env vars, then execute:
```bash
alembic upgrade head
```

### 9. Verify the deployment
Health check:
```bash
curl https://YOUR_BACKEND_URL/health
```

Run the workflow endpoint:
```bash
curl -X POST https://YOUR_BACKEND_URL/api/workflows/run \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Show my open tasks and recent notes."}'
```

### 10. Google Cloud operational notes
- `ticketflow-mcp` should ideally not be public for a real deployment; keep it internal or restricted where possible.
- Put API keys and database passwords in Secret Manager for a real environment.
- Cloud Run services must remain stateless; all durable state belongs in Cloud SQL.

## Limitations
- Single demo user, no authentication
- No external calendar integration
- Minimal natural-language time parsing in fallback mode
- No background reminders or notifications
- No file uploads
- MCP transport and ADK dependencies should be pinned and validated before a live demo

## Future Improvements
- Google login and user-level data isolation
- Google Calendar integration
- richer support issue extraction
- workflow history page with replay
- alerting and reminders
- automated infrastructure with Terraform or Cloud Build pipelines
- better observability and evaluation logging

## Suggested MVP Scope
- one strong end-to-end workflow endpoint
- one small MCP tools service
- one simple demo UI
- Cloud Run + Cloud SQL deployment that can be explained and repeated quickly

## Stretch Features
- per-user workspaces
- Slack or email notifications
- file or PDF note ingestion
- background scheduling
- richer note search and tagging

## Demo Script
1. Open the web UI and explain the architecture at a high level.
2. Paste: `Create a high-priority task for Friday's client demo, block one hour tomorrow at 10 AM, and save note: bring pricing slides.`
3. Show the workflow summary, then point to created tasks, events, and notes.
4. Paste: `Show my open tasks and recent notes.`
5. Show that the system is reading structured data back from PostgreSQL through the same workflow stack.
6. Mention that the backend uses Google ADK with a coordinator plus sub-agents, while the actual data operations are executed through a separate MCP service.
7. Close by showing the deployment path: backend on Cloud Run, MCP service on Cloud Run, and Cloud SQL for PostgreSQL.
