# TicketFlow Agent Architecture

## Overview
TicketFlow Agent is an AI support operations workspace built around four application layers:

1. `frontend/`
   - React + Vite UI
   - Linear-style operations shell with support queue, workflow intake, cases, tasks, calendar, customers, traces, case details, and task details
2. `backend/`
   - FastAPI HTTP API
   - workflow engine
   - Google ADK orchestration
   - Gemini / Vertex AI integration
   - static hosting for the built frontend in production
3. `mcp_service/`
   - FastMCP server
   - database-backed tools for tasks, notes, and events
4. `shared/`
   - shared SQLAlchemy models and Pydantic schemas used by both Python services

## Runtime Flow
1. The user submits a transcript in the UI or by calling `POST /api/workflows/run`.
2. The backend classifies the issue, extracts contact data, creates or updates the customer, creates a support case, and opens a workflow run.
3. The backend attempts ADK execution with a root agent and specialist task, notes, and calendar agents.
4. Agents call wrapper tools that delegate to the MCP gateway.
5. The MCP gateway calls the MCP service over HTTP.
6. The MCP service persists tasks, notes, or callback events in the shared database.
7. The backend stores workflow steps, artifacts, automation summary, next action, confidence notes, and engine mode in the workflow run record.
8. If ADK execution fails and fallback is enabled, deterministic workflow logic creates the artifacts instead.
9. The frontend renders the artifacts in operational workspaces for support queue triage, case management, task execution, calendar callbacks, and trace review.

## Core Records
- `customers`
  - extracted from support conversations
  - stores name, email, and phone when available
- `support_cases`
  - top-level case record for each workflow execution
  - stores source text, issue category, assigned team, severity, and status
- `tasks`
  - follow-up work linked to cases and optionally customers
  - supports status, priority, due date, assigned team, and assigned member updates
- `events`
  - optional scheduled callback actions linked to cases
- `notes`
  - saved summaries and reference notes linked to cases
- `workflow_runs`
  - tracks each execution request, result summary, artifacts, step trace, and engine mode

## Agent Design
- `root_agent`
  - coordinates the overall workflow
- `task_agent`
  - creates or lists tasks
- `calendar_agent`
  - creates or lists events
- `notes_agent`
  - saves and searches notes

The root agent chooses which specialist should act. Tool execution is separated from reasoning so the agents stay focused on orchestration rather than persistence.

## MCP Tool Contract
Current MCP tools:
- `create_task`
- `list_tasks`
- `create_event`
- `list_events`
- `add_note`
- `search_notes`

These tools return structured JSON that the backend converts back into shared schema objects for workflow responses.

## AI Execution And Fallback
- ADK runs when either `GOOGLE_API_KEY` or `GOOGLE_GENAI_USE_VERTEXAI=true` is configured.
- The workflow engine reports `engine_mode` as:
  - `gemini_adk`
  - `heuristic_fallback`
- If AI execution fails and fallback is enabled, the backend still creates a case, note, and follow-up tasks using deterministic logic.
- The workflow engine retries once on Gemini quota throttling before falling back.
- Local development can use `gemini-2.5-flash-lite` for lower quota pressure; Cloud Run defaults to `gemini-2.5-flash` with Vertex AI.

## Current UI Workspaces
- `Support Queue`
  - live queue of cases, selected case summary, assigned tasks, pipeline status, trace ID, and engine mode
- `Cases`
  - three-column case management view with filters, selected case overview, linked tasks, callback, and latest trace
- `Tasks`
  - three-column task execution view with filters, selected task editor, assignee controls, linked case/customer context, and transcript snippet
- `Calendar`
  - callback events grouped by day with links back to cases
- `Case Details` and `Task Details`
  - deep-link editing surfaces for routing, task status, ownership, and history
- `Traces`
  - workflow runs with engine mode and step logs

## Cloud Deployment Shape
The current recommended cloud deployment is:
- one Cloud Run service named `ticketflow`
- `backend` container as the public ingress container on port `8080`
- `mcp` container as a sidecar reached internally over `http://localhost:8001/mcp`
- Cloud SQL for PostgreSQL

This shape keeps MCP private while letting the backend and MCP service share the same Cloud SQL instance.

## Mermaid Sources
- [Architecture Mermaid](/home/proflead/Documents/ticketflow-agent/diagrams/architecture.mmd)
- [Workflow Mermaid](/home/proflead/Documents/ticketflow-agent/diagrams/process-flow.mmd)
- [UI Wireframe Mermaid](/home/proflead/Documents/ticketflow-agent/diagrams/ui-wireframe.mmd)
