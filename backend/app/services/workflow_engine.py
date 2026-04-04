from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from sqlalchemy import desc, select

from ticketflow_shared.models import Event, Note, Task, WorkflowRun, WorkflowStatus
from ticketflow_shared.schemas import (
    DeleteResponse,
    EventCreate,
    EventRead,
    NoteCreate,
    NoteRead,
    StateResponse,
    TaskCreate,
    TaskRead,
    WorkflowResult,
    WorkflowRunRead,
    WorkflowRunRequest,
    WorkflowRunResponse,
    WorkflowStep,
)
from ticketflow_shared.utils import derive_note_title, derive_task_title, parse_relative_schedule

from app.agents.agent import build_root_agent
from app.config import Settings
from app.db import get_session
from app.services.mcp_gateway import MCPGateway

logger = logging.getLogger(__name__)


class WorkflowEngine:
    def __init__(self, settings: Settings):
        self.settings = settings

    async def run(self, request: WorkflowRunRequest) -> WorkflowRunResponse:
        with get_session() as session:
            workflow_run = WorkflowRun(request_text=request.prompt, status=WorkflowStatus.running)
            session.add(workflow_run)
            session.commit()
            session.refresh(workflow_run)

            try:
                result, engine_mode = await self._run_agents(request.prompt)
                workflow_run.status = WorkflowStatus.completed
                workflow_run.summary = result.summary
                workflow_run.steps_json = [step.model_dump(mode="json") for step in result.steps]
                workflow_run.artifacts_json = {
                    "engine_mode": engine_mode,
                    "tasks": [task.model_dump(mode="json") for task in result.tasks],
                    "events": [event.model_dump(mode="json") for event in result.events],
                    "notes": [note.model_dump(mode="json") for note in result.notes],
                }
                workflow_run.completed_at = datetime.now(timezone.utc)
                session.commit()
                return WorkflowRunResponse(
                    workflow_run_id=workflow_run.id,
                    status="completed",
                    engine_mode=engine_mode,
                    summary=result.summary,
                    steps=result.steps,
                    tasks=result.tasks,
                    events=result.events,
                    notes=result.notes,
                    errors=result.errors,
                )
            except Exception as exc:
                workflow_run.status = WorkflowStatus.failed
                workflow_run.error_message = str(exc)
                workflow_run.summary = "Workflow failed before completion."
                workflow_run.completed_at = datetime.now(timezone.utc)
                session.commit()
                return WorkflowRunResponse(
                    workflow_run_id=workflow_run.id,
                    status="failed",
                    engine_mode="heuristic_fallback",
                    summary="The workflow could not be completed.",
                    steps=[],
                    tasks=[],
                    events=[],
                    notes=[],
                    errors=[str(exc)],
                )

    async def _run_agents(self, prompt: str) -> tuple[WorkflowResult, str]:
        gateway = MCPGateway(self.settings.mcp_server_url)
        errors: list[str] = []
        summary = ""
        engine_mode = "heuristic_fallback"

        if self._can_use_adk():
            try:
                agent = build_root_agent(self.settings.gemini_model, gateway)
                session_service = InMemorySessionService()
                session_id = f"ticketflow-{uuid.uuid4()}"
                await session_service.create_session(
                    app_name=self.settings.app_name, user_id="demo-user", session_id=session_id
                )
                runner = Runner(agent=agent, app_name=self.settings.app_name, session_service=session_service)
                user_message = types.Content(role="user", parts=[types.Part(text=prompt)])
                async for event in runner.run_async(user_id="demo-user", session_id=session_id, new_message=user_message):
                    if event.is_final_response() and event.content and event.content.parts:
                        summary = event.content.parts[0].text or ""
                engine_mode = "gemini_adk"
            except Exception as exc:
                if not self.settings.enable_heuristic_fallback:
                    raise
                logger.exception("ADK/Gemini execution failed; falling back to heuristic mode.")
                errors.append(f"ADK execution failed, used heuristic fallback: {exc}")
                summary = await self._heuristic_fallback(prompt, gateway)
        else:
            summary = await self._heuristic_fallback(prompt, gateway)

        if not summary:
            summary = self._compose_summary(gateway)

        return WorkflowResult(
            summary=summary,
            steps=gateway.steps,
            tasks=gateway.created_tasks or gateway.listed_tasks,
            events=gateway.created_events or gateway.listed_events,
            notes=gateway.created_notes or gateway.searched_notes,
            errors=errors,
        ), engine_mode

    def _can_use_adk(self) -> bool:
        return bool(self.settings.google_api_key or self.settings.google_genai_use_vertexai)

    async def _heuristic_fallback(self, prompt: str, gateway: MCPGateway) -> str:
        text = prompt.strip()
        lower = text.lower()

        if "show" in lower or "list" in lower:
            if "task" in lower:
                await gateway.list_tasks("task_agent", status="open", limit=10)
            if "event" in lower or "schedule" in lower:
                await gateway.list_events("calendar_agent", limit=10)
            if "note" in lower or "onboarding" in lower:
                query = "onboarding" if "onboarding" in lower else " "
                await gateway.search_notes("notes_agent", query=query.strip() or " ", limit=10)
            return self._compose_summary(gateway)

        if "note:" in lower:
            note_text = text.split("note:", maxsplit=1)[1].strip()
            await gateway.add_note("notes_agent", NoteCreate(title=derive_note_title(note_text), body=note_text))

        if "meeting notes" in lower or "save these meeting notes" in lower:
            await gateway.add_note("notes_agent", NoteCreate(title="Meeting Notes", body=text))
            followups = self._extract_follow_up_tasks(text)
            for task_title in followups:
                await gateway.create_task(
                    "task_agent",
                    TaskCreate(title=task_title, description=text, priority="medium", source_text=text),
                )

        if "support issue" in lower:
            await gateway.add_note("notes_agent", NoteCreate(title="Support Issue", body=text))
            await gateway.create_task(
                "task_agent",
                TaskCreate(
                    title="Follow up on support issue",
                    description=text,
                    priority="high" if "high" in lower or "urgent" in lower else "medium",
                    source_text=text,
                ),
            )

        if "task" in lower or "follow-up task" in lower or "follow up task" in lower:
            priority = "high" if "high-priority" in lower or "high priority" in lower else "medium"
            await gateway.create_task(
                "task_agent",
                TaskCreate(title=derive_task_title(text), description=text, priority=priority, source_text=text),
            )

        if "block" in lower or "schedule" in lower or "reminder" in lower:
            parsed = parse_relative_schedule(text)
            if parsed:
                start_at, end_at = parsed
                await gateway.create_event(
                    "calendar_agent",
                    EventCreate(
                        title=derive_task_title(text),
                        description=text,
                        start_at=start_at,
                        end_at=end_at,
                        source_text=text,
                    ),
                )

        return self._compose_summary(gateway)

    def _extract_follow_up_tasks(self, text: str) -> list[str]:
        bullets = []
        for line in text.splitlines():
            clean = line.strip("-* ").strip()
            if clean and ("follow" in clean.lower() or "action" in clean.lower() or "todo" in clean.lower()):
                bullets.append(clean[:120])
        return bullets or ["Review meeting notes and define follow-up actions"]

    def _compose_summary(self, gateway: MCPGateway) -> str:
        parts = []
        if gateway.created_tasks:
            parts.append(f"Created {len(gateway.created_tasks)} task(s)")
        if gateway.created_events:
            parts.append(f"scheduled {len(gateway.created_events)} event(s)")
        if gateway.created_notes:
            parts.append(f"saved {len(gateway.created_notes)} note(s)")
        if gateway.listed_tasks:
            parts.append(f"returned {len(gateway.listed_tasks)} open task(s)")
        if gateway.listed_events:
            parts.append(f"returned {len(gateway.listed_events)} event(s)")
        if gateway.searched_notes:
            parts.append(f"found {len(gateway.searched_notes)} note(s)")
        return ", ".join(parts).capitalize() + "." if parts else "No actions were taken."

    def get_state(self) -> StateResponse:
        with get_session() as session:
            tasks = session.scalars(select(Task).order_by(desc(Task.created_at)).limit(10)).all()
            events = session.scalars(select(Event).order_by(desc(Event.start_at)).limit(10)).all()
            notes = session.scalars(select(Note).order_by(desc(Note.created_at)).limit(10)).all()
            runs = session.scalars(select(WorkflowRun).order_by(desc(WorkflowRun.created_at)).limit(10)).all()
            return StateResponse(
                tasks=[TaskRead.model_validate(task) for task in tasks],
                events=[EventRead.model_validate(event) for event in events],
                notes=[NoteRead.model_validate(note) for note in notes],
                workflow_runs=[
                    WorkflowRunRead.model_validate(
                        {
                            "id": run.id,
                            "request_text": run.request_text,
                            "status": run.status.value if hasattr(run.status, "value") else run.status,
                            "summary": run.summary,
                            "engine_mode": (run.artifacts_json or {}).get("engine_mode"),
                            "steps_json": run.steps_json,
                            "artifacts_json": run.artifacts_json,
                            "error_message": run.error_message,
                            "created_at": run.created_at,
                            "completed_at": run.completed_at,
                        }
                    )
                    for run in runs
                ],
            )

    def delete_task(self, task_id: str) -> DeleteResponse:
        with get_session() as session:
            task = session.get(Task, uuid.UUID(task_id))
            if task is None:
                raise ValueError("Task not found.")
            session.delete(task)
            session.commit()
            return DeleteResponse(deleted_id=task.id, resource="task")

    def delete_event(self, event_id: str) -> DeleteResponse:
        with get_session() as session:
            event = session.get(Event, uuid.UUID(event_id))
            if event is None:
                raise ValueError("Event not found.")
            session.delete(event)
            session.commit()
            return DeleteResponse(deleted_id=event.id, resource="event")

    def delete_note(self, note_id: str) -> DeleteResponse:
        with get_session() as session:
            note = session.get(Note, uuid.UUID(note_id))
            if note is None:
                raise ValueError("Note not found.")
            session.delete(note)
            session.commit()
            return DeleteResponse(deleted_id=note.id, resource="note")

    def delete_workflow_run(self, workflow_run_id: str) -> DeleteResponse:
        with get_session() as session:
            workflow_run = session.get(WorkflowRun, uuid.UUID(workflow_run_id))
            if workflow_run is None:
                raise ValueError("Workflow run not found.")
            session.delete(workflow_run)
            session.commit()
            return DeleteResponse(deleted_id=workflow_run.id, resource="workflow_run")
