from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TaskCreate(BaseModel):
    case_id: UUID | None = None
    customer_id: UUID | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    due_at: datetime | None = None
    issue_category: str | None = None
    assigned_team: str | None = None
    assigned_member: str | None = None
    source_text: str | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID | None
    customer_id: UUID | None
    title: str
    description: str | None
    priority: str
    status: str
    due_at: datetime | None
    issue_category: str | None
    assigned_team: str | None
    assigned_member: str | None
    source_text: str | None
    created_at: datetime
    updated_at: datetime


class TaskAssignmentUpdate(BaseModel):
    assigned_member: str | None = None


class TaskUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    priority: Literal["low", "medium", "high"] = "medium"
    status: Literal["open", "completed"] = "open"
    due_at: datetime | None = None


class EventCreate(BaseModel):
    case_id: UUID | None = None
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    start_at: datetime
    end_at: datetime
    source_text: str | None = None


class EventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID | None
    title: str
    description: str | None
    start_at: datetime
    end_at: datetime
    status: str
    source_text: str | None
    created_at: datetime
    updated_at: datetime


class NoteCreate(BaseModel):
    case_id: UUID | None = None
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1)
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID | None
    title: str
    body: str
    metadata_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class WorkflowStep(BaseModel):
    agent: str
    action: str
    status: Literal["planned", "completed", "failed"]
    detail: str
    tool_name: str | None = None
    tool_input: dict[str, Any] | None = None
    tool_output: dict[str, Any] | None = None


class SupportCaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    customer_id: UUID | None
    title: str
    source_text: str
    issue_category: str | None
    assigned_team: str | None
    severity: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str | None
    email: str | None
    phone: str | None
    created_at: datetime
    updated_at: datetime


class WorkflowArtifacts(BaseModel):
    tasks: list[TaskRead] = Field(default_factory=list)
    events: list[EventRead] = Field(default_factory=list)
    notes: list[NoteRead] = Field(default_factory=list)


class WorkflowResult(BaseModel):
    summary: str
    case_summary: str | None = None
    steps: list[WorkflowStep] = Field(default_factory=list)
    triage: dict[str, Any] = Field(default_factory=dict)
    case: SupportCaseRead | None = None
    customer: CustomerRead | None = None
    tasks: list[TaskRead] = Field(default_factory=list)
    events: list[EventRead] = Field(default_factory=list)
    notes: list[NoteRead] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)


class WorkflowRunRequest(BaseModel):
    prompt: str = Field(min_length=1, description="User prompt to run through the workflow system.")
    client_metadata: dict[str, Any] = Field(default_factory=dict)


class WorkflowRunResponse(WorkflowResult):
    workflow_run_id: UUID
    status: Literal["completed", "failed"]
    engine_mode: Literal["gemini_adk", "heuristic_fallback"]


class WorkflowRunRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    case_id: UUID | None = None
    request_text: str
    status: str
    summary: str | None
    engine_mode: str | None = None
    steps_json: list[dict[str, Any]]
    artifacts_json: dict[str, Any]
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None


class StateResponse(BaseModel):
    cases: list[SupportCaseRead]
    customers: list[CustomerRead]
    tasks: list[TaskRead]
    events: list[EventRead]
    notes: list[NoteRead]
    workflow_runs: list[WorkflowRunRead]


class SupportCaseDetailResponse(BaseModel):
    case: SupportCaseRead
    customer: CustomerRead | None = None
    tasks: list[TaskRead] = Field(default_factory=list)
    workflow_runs: list[WorkflowRunRead] = Field(default_factory=list)


class DeleteResponse(BaseModel):
    ok: bool = True
    deleted_id: UUID
    resource: Literal["task", "event", "note", "workflow_run", "support_case", "customer"]
