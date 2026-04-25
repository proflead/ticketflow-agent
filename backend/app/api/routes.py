from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ticketflow_shared.schemas import (
    DeleteResponse,
    StateResponse,
    SupportCaseDetailResponse,
    SupportCaseRead,
    SupportCaseUpdate,
    TaskAssignmentUpdate,
    TaskRead,
    TaskUpdate,
    WorkflowRunRequest,
    WorkflowRunResponse,
)

from app.config import get_settings
from app.services.workflow_engine import WorkflowEngine


router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "ticketflow-api"}


@router.post("/api/workflows/run", response_model=WorkflowRunResponse)
async def run_workflow(payload: WorkflowRunRequest) -> WorkflowRunResponse:
    engine = WorkflowEngine(get_settings())
    return await engine.run(payload)


@router.get("/api/state", response_model=StateResponse)
async def get_state() -> StateResponse:
    engine = WorkflowEngine(get_settings())
    return engine.get_state()


@router.post("/api/demo/reset")
async def reset_demo_data() -> dict[str, int | bool]:
    engine = WorkflowEngine(get_settings())
    return engine.reset_demo_data()


@router.get("/api/cases/{case_id}", response_model=SupportCaseDetailResponse)
async def get_case_detail(case_id: str) -> SupportCaseDetailResponse:
    engine = WorkflowEngine(get_settings())
    try:
        return engine.get_case_detail(case_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/api/cases/{case_id}", response_model=SupportCaseRead)
async def update_case(case_id: str, payload: SupportCaseUpdate) -> SupportCaseRead:
    engine = WorkflowEngine(get_settings())
    try:
        return engine.update_case(case_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/api/tasks/{task_id}/assignment", response_model=TaskRead)
async def update_task_assignment(task_id: str, payload: TaskAssignmentUpdate) -> TaskRead:
    engine = WorkflowEngine(get_settings())
    try:
        return engine.update_task_assignment(task_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.patch("/api/tasks/{task_id}", response_model=TaskRead)
async def update_task(task_id: str, payload: TaskUpdate) -> TaskRead:
    engine = WorkflowEngine(get_settings())
    try:
        return engine.update_task(task_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/api/tasks/{task_id}", response_model=DeleteResponse)
async def delete_task(task_id: str) -> DeleteResponse:
    engine = WorkflowEngine(get_settings())
    try:
        return engine.delete_task(task_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/api/events/{event_id}", response_model=DeleteResponse)
async def delete_event(event_id: str) -> DeleteResponse:
    engine = WorkflowEngine(get_settings())
    try:
        return engine.delete_event(event_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/api/notes/{note_id}", response_model=DeleteResponse)
async def delete_note(note_id: str) -> DeleteResponse:
    engine = WorkflowEngine(get_settings())
    try:
        return engine.delete_note(note_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/api/workflow-runs/{workflow_run_id}", response_model=DeleteResponse)
async def delete_workflow_run(workflow_run_id: str) -> DeleteResponse:
    engine = WorkflowEngine(get_settings())
    try:
        return engine.delete_workflow_run(workflow_run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/api/cases/{case_id}", response_model=DeleteResponse)
async def delete_case(case_id: str) -> DeleteResponse:
    engine = WorkflowEngine(get_settings())
    try:
        return engine.delete_case(case_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/api/customers/{customer_id}", response_model=DeleteResponse)
async def delete_customer(customer_id: str) -> DeleteResponse:
    engine = WorkflowEngine(get_settings())
    try:
        return engine.delete_customer(customer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
