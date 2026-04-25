import uuid
from datetime import datetime, timezone
from typing import Any

import pytest

from app.services.mcp_gateway import MCPGateway
from ticketflow_shared.schemas import NoteCreate, TaskCreate

pytestmark = pytest.mark.anyio


class FakeGateway(MCPGateway):
    async def _call(self, agent: str, tool_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if tool_name == "create_task":
            task = payload["task"] | {
                "id": str(uuid.uuid4()),
                "status": "open",
                "created_at": now,
                "updated_at": now,
            }
            return {"task": task}
        if tool_name == "add_note":
            note = payload["note"] | {
                "id": str(uuid.uuid4()),
                "created_at": now,
                "updated_at": now,
            }
            return {"note": note}
        raise AssertionError(f"Unexpected tool: {tool_name}")


async def test_gateway_create_task_records_created_task() -> None:
    case_id = uuid.uuid4()
    customer_id = uuid.uuid4()
    gateway = FakeGateway("http://localhost:8001/mcp", active_case_id=case_id, active_customer_id=customer_id)

    task = await gateway.create_task("task_agent", TaskCreate(title="Send executive status update"))

    assert task.case_id == case_id
    assert task.customer_id == customer_id
    assert gateway.created_tasks == [task]


async def test_gateway_add_note_records_created_note() -> None:
    case_id = uuid.uuid4()
    gateway = FakeGateway("http://localhost:8001/mcp", active_case_id=case_id)

    note = await gateway.add_note("notes_agent", NoteCreate(title="Conversation Summary", body="Customer is blocked."))

    assert note.case_id == case_id
    assert note.title == "Conversation Summary"
    assert gateway.created_notes == [note]
