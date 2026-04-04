from __future__ import annotations

from fastapi import FastAPI
from fastmcp import FastMCP
from sqlalchemy import Select, desc, or_, select

from ticketflow_shared.models import Event, Note, Task
from ticketflow_shared.schemas import EventCreate, EventRead, NoteCreate, NoteRead, TaskCreate, TaskRead
from ticketflow_shared.utils import derive_note_title

from .db import get_session

mcp = FastMCP("TicketFlow MCP Service")


@mcp.tool
def create_task(task: TaskCreate) -> dict:
    """Create a task record."""
    with get_session() as session:
        db_task = Task(
            title=task.title,
            description=task.description,
            priority=task.priority,
            due_at=task.due_at,
            source_text=task.source_text,
        )
        session.add(db_task)
        session.commit()
        session.refresh(db_task)
        return {"task": TaskRead.model_validate(db_task).model_dump(mode="json")}


@mcp.tool
def list_tasks(status: str = "open", limit: int = 10) -> dict:
    """List recent tasks."""
    with get_session() as session:
        stmt: Select[tuple[Task]] = select(Task).order_by(desc(Task.created_at)).limit(limit)
        if status:
            stmt = stmt.where(Task.status == status)
        tasks = session.scalars(stmt).all()
        return {"tasks": [TaskRead.model_validate(task).model_dump(mode="json") for task in tasks]}


@mcp.tool
def create_event(event: EventCreate) -> dict:
    """Create a scheduled event."""
    with get_session() as session:
        db_event = Event(
            title=event.title,
            description=event.description,
            start_at=event.start_at,
            end_at=event.end_at,
            source_text=event.source_text,
        )
        session.add(db_event)
        session.commit()
        session.refresh(db_event)
        return {"event": EventRead.model_validate(db_event).model_dump(mode="json")}


@mcp.tool
def list_events(limit: int = 10) -> dict:
    """List recent scheduled events."""
    with get_session() as session:
        stmt = select(Event).order_by(desc(Event.start_at)).limit(limit)
        events = session.scalars(stmt).all()
        return {"events": [EventRead.model_validate(event).model_dump(mode="json") for event in events]}


@mcp.tool
def add_note(note: NoteCreate) -> dict:
    """Save a note."""
    with get_session() as session:
        title = note.title or derive_note_title(note.body)
        db_note = Note(title=title, body=note.body, metadata_json=note.metadata_json)
        session.add(db_note)
        session.commit()
        session.refresh(db_note)
        return {"note": NoteRead.model_validate(db_note).model_dump(mode="json")}


@mcp.tool
def search_notes(query: str, limit: int = 10) -> dict:
    """Search notes by title or body."""
    with get_session() as session:
        stmt = (
            select(Note)
            .where(or_(Note.title.ilike(f"%{query}%"), Note.body.ilike(f"%{query}%")))
            .order_by(desc(Note.created_at))
            .limit(limit)
        )
        notes = session.scalars(stmt).all()
        return {"notes": [NoteRead.model_validate(note).model_dump(mode="json") for note in notes]}


mcp_http_app = mcp.http_app(path="/mcp", transport="streamable-http", json_response=True)
app = FastAPI(title="TicketFlow MCP Service", lifespan=mcp_http_app.lifespan)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "ticketflow-mcp"}


app.mount("/", mcp_http_app)
