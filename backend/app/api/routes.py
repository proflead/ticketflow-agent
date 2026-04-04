from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ticketflow_shared.schemas import DeleteResponse, StateResponse, WorkflowRunRequest, WorkflowRunResponse

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
