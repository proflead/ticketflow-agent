# TicketFlow Agent Architecture

## Overview
TicketFlow Agent is a hackathon-scale, API-first multi-agent productivity assistant built around three deployable parts:

1. `backend/`
   - FastAPI HTTP API
   - Google ADK coordinator and sub-agents
   - MCP client wrapper
   - workflow execution and persistence
   - static hosting for the built frontend
2. `mcp_service/`
   - separate MCP server process
   - PostgreSQL-backed tools for tasks, events, and notes
3. `frontend/`
   - minimal React + Vite UI for the demo

## Runtime Flow
1. A user submits a request in the frontend or by `POST /api/workflows/run`.
2. The backend creates a `workflow_runs` record with `running` status.
3. The ADK `root_agent` interprets the request and delegates to `task_agent`, `calendar_agent`, and `notes_agent`.
4. Each worker agent uses wrapper tools that call the MCP service over HTTP.
5. The MCP service executes database-backed tool operations and returns structured JSON.
6. The backend stores the workflow trace and artifacts in `workflow_runs`.
7. The backend responds with a structured workflow payload.

## Why This Shape Works On Google Cloud
- Cloud Run is a good fit for both Python services because they are stateless and HTTP-based.
- Cloud SQL stores all durable state.
- The frontend is served by the backend container in production, so the public demo only needs one URL.
- No background worker, local filesystem, or local-only IPC transport is required.

## Database Schema
- `tasks`
  - title, description, priority, status, due_at, source_text, timestamps
- `events`
  - title, description, start_at, end_at, status, source_text, timestamps
- `notes`
  - title, body, metadata_json, timestamps
- `workflow_runs`
  - request_text, status, summary, steps_json, artifacts_json, error_message, timestamps

## Agent Design
- `root_agent`
  - coordinator that routes combined workflows
- `task_agent`
  - creates and lists tasks
- `calendar_agent`
  - creates and lists internal events
- `notes_agent`
  - saves and searches notes

## Tooling Contract
MCP tools exposed by the tools service:
- `create_task`
- `list_tasks`
- `create_event`
- `list_events`
- `add_note`
- `search_notes`

Each tool returns small JSON payloads that are converted back into shared Pydantic models in the backend.
