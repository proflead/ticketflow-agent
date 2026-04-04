from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from google.adk.agents import LlmAgent

from ticketflow_shared.schemas import EventCreate, NoteCreate, TaskCreate
from ticketflow_shared.utils import derive_event_title, derive_note_title, derive_task_title, parse_relative_schedule

from app.services.mcp_gateway import MCPGateway, tool_from_async


def build_root_agent(model: str, gateway: MCPGateway) -> LlmAgent:
    async def create_task_from_request(
        request_text: str | None = None,
        title: str | None = None,
        priority: str = "medium",
        description: str | None = None,
        issue_category: str | None = None,
        assigned_team: str | None = None,
    ) -> dict:
        source_text = request_text or description or title
        if not source_text:
            return {"ok": False, "error": "A task needs request_text, description, or title."}
        task = TaskCreate(
            title=title or derive_task_title(source_text),
            description=description or source_text,
            priority=priority,
            issue_category=issue_category,
            assigned_team=assigned_team,
            source_text=source_text,
        )
        created = await gateway.create_task("task_agent", task)
        return created.model_dump(mode="json")

    async def create_event_from_request(
        request_text: str | None = None,
        title: str | None = None,
        description: str | None = None,
        start_at_iso: str | None = None,
        end_at_iso: str | None = None,
        start_at: str | None = None,
        end_at: str | None = None,
        event_title: str | None = None,
        details: str | None = None,
    ) -> dict:
        source_text = request_text or description or details or title or event_title
        start_value = start_at_iso or start_at
        end_value = end_at_iso or end_at
        effective_title = title or event_title
        effective_description = description or details

        if start_value and end_value:
            start_dt = datetime.fromisoformat(start_value)
            end_dt = datetime.fromisoformat(end_value)
        else:
            if not source_text:
                return {
                    "ok": False,
                    "error": "An event needs request_text, description, title, or explicit start/end times.",
                }
            parsed = parse_relative_schedule(source_text, now=datetime.now(timezone.utc))
            if parsed is None:
                return {
                    "ok": False,
                    "error": "Could not determine a schedule. Ask the user for an explicit time like 'tomorrow at 10 AM'.",
                }
            start_dt, end_dt = parsed

        if not source_text:
            source_text = f"Scheduled event from {start_dt.isoformat()} to {end_dt.isoformat()}"

        event = EventCreate(
            title=effective_title or derive_event_title(source_text),
            description=effective_description or source_text,
            start_at=start_dt,
            end_at=end_dt,
            source_text=source_text,
        )
        created = await gateway.create_event("calendar_agent", event)
        return created.model_dump(mode="json")

    async def save_note_from_request(
        note_text: str | None = None,
        title: str | None = None,
        body: str | None = None,
        request_text: str | None = None,
    ) -> dict:
        source_text = note_text or body or request_text or title
        if not source_text:
            return {"ok": False, "error": "A note needs note_text, body, request_text, or title."}
        note = NoteCreate(
            title=title or derive_note_title(source_text),
            body=body or note_text or request_text or title or source_text,
            metadata_json={"source": "agent"},
        )
        created = await gateway.add_note("notes_agent", note)
        return created.model_dump(mode="json")

    async def list_open_tasks(limit: int = 10) -> dict[str, Any]:
        tasks = await gateway.list_tasks("task_agent", status="open", limit=limit)
        return {"tasks": [task.model_dump(mode="json") for task in tasks]}

    async def list_recent_events(limit: int = 10) -> dict[str, Any]:
        events = await gateway.list_events("calendar_agent", limit=limit)
        return {"events": [event.model_dump(mode="json") for event in events]}

    async def search_existing_notes(query: str, limit: int = 10) -> dict[str, Any]:
        notes = await gateway.search_notes("notes_agent", query=query, limit=limit)
        return {"notes": [note.model_dump(mode="json") for note in notes]}

    task_agent = LlmAgent(
        name="task_agent",
        model=model,
        description="Creates and lists task records.",
        instruction=(
            "You are the task specialist. Use the provided tools to create tasks or list open tasks. "
            "When the user requests follow-up tasks, extract concise titles and create them. "
            "When the work relates to a support issue or bug, include an issue_category and assigned_team "
            "that best fit the problem domain. "
            "Return a short natural-language handoff summary."
        ),
        tools=[
            tool_from_async("create_task_from_request", "Create a task from user text.", create_task_from_request),
            tool_from_async("list_open_tasks", "List open tasks.", list_open_tasks),
        ],
    )

    calendar_agent = LlmAgent(
        name="calendar_agent",
        model=model,
        description="Creates and lists scheduled events from explicit or relative times.",
        instruction=(
            "You are the scheduling specialist. Use the event tools when the request asks to block time, "
            "schedule a reminder, or create a calendar entry. Do not guess unclear dates."
        ),
        tools=[
            tool_from_async("create_event_from_request", "Create an event from user text.", create_event_from_request),
            tool_from_async("list_recent_events", "List recent events.", list_recent_events),
        ],
    )

    notes_agent = LlmAgent(
        name="notes_agent",
        model=model,
        description="Saves notes and searches saved notes.",
        instruction=(
            "You are the notes specialist. Save meeting notes, support issue notes, and reminder notes. "
            "Search notes when the user asks about related information."
        ),
        tools=[
            tool_from_async("save_note_from_request", "Save a note from user text.", save_note_from_request),
            tool_from_async("search_existing_notes", "Search notes by query.", search_existing_notes),
        ],
    )

    return LlmAgent(
        name="root_agent",
        model=model,
        description="Coordinates tasks, scheduling, and notes using specialist sub-agents.",
        instruction=(
            "You are the TicketFlow coordinator. Interpret the user's productivity request, route it to the right "
            "specialist agents, and complete all requested actions. Use task_agent for tasks, calendar_agent for "
            "blocking time or reminders, and notes_agent for saving or searching notes. Handle combined workflows in "
            "one run. After the specialists finish, return a concise summary of actions completed and any ambiguity."
        ),
        sub_agents=[task_agent, calendar_agent, notes_agent],
    )


class NullGateway(MCPGateway):
    def __init__(self) -> None:
        super().__init__(server_url="http://localhost:8001/mcp")


root_agent = build_root_agent(model="gemini-2.0-flash", gateway=NullGateway())
