import { DeleteResponse, StateResponse, WorkflowResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function runWorkflow(prompt: string): Promise<WorkflowResponse> {
  const response = await fetch(`${API_BASE}/api/workflows/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error(`Workflow request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchState(): Promise<StateResponse> {
  const response = await fetch(`${API_BASE}/api/state`);
  if (!response.ok) {
    throw new Error(`State request failed with status ${response.status}`);
  }
  return response.json();
}

async function deleteResource(path: string): Promise<DeleteResponse> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Delete request failed with status ${response.status}`);
  }

  return response.json();
}

export function deleteTask(id: string) {
  return deleteResource(`/api/tasks/${id}`);
}

export function deleteEvent(id: string) {
  return deleteResource(`/api/events/${id}`);
}

export function deleteNote(id: string) {
  return deleteResource(`/api/notes/${id}`);
}

export function deleteWorkflowRun(id: string) {
  return deleteResource(`/api/workflow-runs/${id}`);
}
