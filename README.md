# TicketFlow Agent

TicketFlow Agent is an AI-powered support workflow application that turns natural-language support conversations into structured support cases, customers, tasks, notes, and optional calendar events. It combines a React frontend, a FastAPI backend, Google ADK agent orchestration, an MCP tool layer, and a shared relational database.

## What The App Does
- Accepts a support chat transcript or free-form support request
- Extracts customer details and a short conversation summary
- Classifies the issue by category, assigned team, and severity
- Creates a support case and workflow run record
- Uses ADK agents to generate follow-up actions when AI execution succeeds
- Falls back to deterministic workflow logic when AI execution is unavailable
- Persists tasks, notes, events, cases, customers, and workflow history
- Lets operators review and update records through the web UI

## Current Product Shape
- `frontend/`
  - React + Vite UI
  - pages for workflow execution, tasks, customers, support cases, run logs, and case details
- `backend/`
  - FastAPI API
  - workflow engine
  - Google ADK agent orchestration
  - Gemini / Vertex AI integration
  - serves the built frontend in production
- `mcp_service/`
  - FastMCP server
  - database-backed tools for creating and listing tasks, notes, and events
- `shared/`
  - shared SQLAlchemy models and Pydantic schemas
- `alembic/`
  - database migrations

## Runtime Flow
1. A user submits a support request in the workflow page or through `POST /api/workflows/run`.
2. The backend extracts intake data, classifies the issue, creates the customer if needed, creates a support case, and opens a workflow run record.
3. The backend tries to execute the ADK root agent with task, notes, and calendar specialists.
4. Agent actions are executed through the MCP gateway, which calls the MCP service over HTTP.
5. The MCP service persists tasks, notes, and events in the shared database.
6. If ADK execution fails and fallback is enabled, the backend runs deterministic workflow logic instead.
7. The final response includes the case summary, triage result, workflow steps, created artifacts, and the engine mode used.

## UI Pages
- `Home`
  - landing page and app framing
- `Run Workflow`
  - prompt input, sample chats, latest workflow result, engine mode, steps, and artifacts
- `Tasks`
  - operator view of created tasks
- `Customers`
  - customer records extracted from support conversations
- `Support Cases`
  - case list, case filter, and linked tasks
- `Case Details`
  - original conversation, routing, customer info, task editing, and workflow history
- `Run Logs`
  - workflow execution history and engine mode used

## Diagrams
- [Architecture](/home/proflead/Documents/ticketflow-agent/architecture.md)
- [Architecture Mermaid](/home/proflead/Documents/ticketflow-agent/diagrams/architecture.mmd)
- [Workflow Mermaid](/home/proflead/Documents/ticketflow-agent/diagrams/process-flow.mmd)
- [UI Wireframe Mermaid](/home/proflead/Documents/ticketflow-agent/diagrams/ui-wireframe.mmd)

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker with permission to access the daemon
- Gemini API key or Vertex AI credentials if you want ADK execution

### 1. Start PostgreSQL
```bash
docker compose up -d postgres
```

### 2. Create the virtual environment and install dependencies
```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
python -m pip install -r mcp_service/requirements.txt
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

Minimum local settings:
```bash
DATABASE_URL=postgresql+psycopg://ticketflow:ticketflow@localhost:5432/ticketflow
MCP_SERVER_URL=http://localhost:8001/mcp
VITE_API_BASE_URL=http://localhost:8080
GOOGLE_API_KEY=your_api_key
GOOGLE_GENAI_USE_VERTEXAI=false
GEMINI_MODEL=gemini-2.5-flash
ENABLE_HEURISTIC_FALLBACK=true
```

Notes:
- Use `GOOGLE_API_KEY` for the simplest local ADK path.
- If using Vertex AI, set `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION`.
- The backend returns `engine_mode` as either `gemini_adk` or `heuristic_fallback`.

### 5. Run migrations
```bash
python -m alembic upgrade head
```

### 6. Start the services
MCP service:
```bash
source .venv/bin/activate
./scripts/run_local_mcp.sh
```

Backend:
```bash
source .venv/bin/activate
./scripts/run_local_backend.sh
```

Frontend:
```bash
cd frontend
npm run dev
```

Local URLs:
- frontend: `http://localhost:5173`
- backend: `http://localhost:8080`
- MCP service: `http://localhost:8001/mcp`

## API Surface
- `GET /health`
- `POST /api/workflows/run`
- `GET /api/state`
- `GET /api/cases/{case_id}`
- `PATCH /api/tasks/{task_id}`
- `PATCH /api/tasks/{task_id}/assignment`
- `DELETE /api/tasks/{task_id}`
- `DELETE /api/events/{event_id}`
- `DELETE /api/notes/{note_id}`
- `DELETE /api/workflow-runs/{workflow_run_id}`
- `DELETE /api/cases/{case_id}`
- `DELETE /api/customers/{customer_id}`

### Example Workflow Request
```bash
curl -X POST http://localhost:8080/api/workflows/run \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Live chat transcript:\nCustomer: Hi, we onboarded three new teammates today and none of them can reset their password.\nCustomer: My name is Sarah Lee. You can reach me at sarah.lee@northstar.io or +1 415 555 0101.\nAgent: Thanks, I am checking. Did they get the welcome email?\nCustomer: Yes, but the reset link says permission denied.\nAgent: Understood. I will escalate this."
  }'
```

### Example State Request
```bash
curl http://localhost:8080/api/state
```

## Deployment
The current recommended production shape is:
- one Cloud Run service named `ticketflow`
- two containers inside that service
  - `backend` as the public ingress container on port `8080`
  - `mcp` as a sidecar container reached at `http://localhost:8001/mcp`
- Cloud SQL for PostgreSQL

The default deployment script is:
- [scripts/deploy_cloudrun.sh](/home/proflead/Documents/ticketflow-agent/scripts/deploy_cloudrun.sh)

The deploy guide is:
- [cloud-run-deploy.md](/home/proflead/Documents/ticketflow-agent/cloud-run-deploy.md)

Current deployment defaults:
- Cloud Run region can stay regional, for example `asia-southeast1`
- Vertex AI defaults to `GOOGLE_CLOUD_LOCATION=global`
- Gemini defaults to `gemini-2.5-flash`

## Why The AI Stack Looks Like This
- ADK handles agent orchestration and lets the backend route work through specialist task, notes, and calendar agents.
- MCP provides a clean tool-execution layer so agents do not talk to the database directly.
- FastAPI keeps the API and workflow engine simple to deploy and inspect.
- PostgreSQL keeps workflow artifacts durable and queryable.
- Cloud Run + Cloud SQL make the stack practical for demo and production-style deployment.

## Known Behavior
- If Gemini or Vertex execution fails and `ENABLE_HEURISTIC_FALLBACK=true`, the app still creates usable case artifacts through deterministic logic.
- The workflow result always exposes which engine ran through `engine_mode`.
- The UI intentionally surfaces whether a run used `Gemini ADK` or `Fallback`.
