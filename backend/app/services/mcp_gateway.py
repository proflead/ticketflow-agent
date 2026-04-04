from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any

from fastmcp import Client

from ticketflow_shared.schemas import EventCreate, EventRead, NoteCreate, NoteRead, TaskCreate, TaskRead, WorkflowStep


@dataclass
class MCPGateway:
    server_url: str
    steps: list[WorkflowStep] = field(default_factory=list)
    created_tasks: list[TaskRead] = field(default_factory=list)
    created_events: list[EventRead] = field(default_factory=list)
    created_notes: list[NoteRead] = field(default_factory=list)
    listed_tasks: list[TaskRead] = field(default_factory=list)
    listed_events: list[EventRead] = field(default_factory=list)
    searched_notes: list[NoteRead] = field(default_factory=list)

    async def _call(self, agent: str, tool_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        client = Client(self.server_url)
        async with client:
            result = await client.call_tool(tool_name, payload)
        data = result.data if hasattr(result, "data") else result
        self.steps.append(
            WorkflowStep(
                agent=agent,
                action=f"Called MCP tool `{tool_name}`",
                status="completed",
                detail=f"{agent} executed {tool_name}.",
                tool_name=tool_name,
                tool_input=payload,
                tool_output=data if isinstance(data, dict) else {"result": data},
            )
        )
        return data if isinstance(data, dict) else {"result": data}

    async def create_task(self, agent: str, task: TaskCreate) -> TaskRead:
        data = await self._call(agent, "create_task", {"task": task.model_dump(mode="json")})
        task_out = TaskRead.model_validate(data["task"])
        self.created_tasks.append(task_out)
        return task_out

    async def list_tasks(self, agent: str, status: str = "open", limit: int = 10) -> list[TaskRead]:
        data = await self._call(agent, "list_tasks", {"status": status, "limit": limit})
        tasks = [TaskRead.model_validate(item) for item in data["tasks"]]
        self.listed_tasks = tasks
        return tasks

    async def create_event(self, agent: str, event: EventCreate) -> EventRead:
        data = await self._call(agent, "create_event", {"event": event.model_dump(mode="json")})
        event_out = EventRead.model_validate(data["event"])
        self.created_events.append(event_out)
        return event_out

    async def list_events(self, agent: str, limit: int = 10) -> list[EventRead]:
        data = await self._call(agent, "list_events", {"limit": limit})
        events = [EventRead.model_validate(item) for item in data["events"]]
        self.listed_events = events
        return events

    async def add_note(self, agent: str, note: NoteCreate) -> NoteRead:
        data = await self._call(agent, "add_note", {"note": note.model_dump(mode="json")})
        note_out = NoteRead.model_validate(data["note"])
        self.created_notes.append(note_out)
        return note_out

    async def search_notes(self, agent: str, query: str, limit: int = 10) -> list[NoteRead]:
        data = await self._call(agent, "search_notes", {"query": query, "limit": limit})
        notes = [NoteRead.model_validate(item) for item in data["notes"]]
        self.searched_notes = notes
        return notes


def tool_from_async(name: str, description: str, func: Callable[..., Awaitable[dict[str, Any] | str]]) -> Callable[..., Any]:
    """Wrap an async MCP call for ADK tool registration."""

    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        return await func(*args, **kwargs)

    wrapper.__name__ = name
    wrapper.__doc__ = description
    return wrapper
