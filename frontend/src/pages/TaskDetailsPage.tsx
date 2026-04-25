import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchState, updateTask, updateTaskAssignment } from "../api";
import type { StateResponse, Task } from "../types";

const TEAM_MEMBERS = [
  { name: "Lena Park", team: "Identity & Access" },
  { name: "Jordan Miles", team: "Identity & Access" },
  { name: "Marcus Chen", team: "Billing" },
  { name: "Priya Nair", team: "Billing" },
  { name: "Ava Patel", team: "Communications" },
  { name: "Derek Shaw", team: "Communications" },
  { name: "Noah Kim", team: "Customer Success" },
  { name: "Mina Lopez", team: "Customer Success" },
  { name: "Sofia Rivera", team: "Engineering" },
  { name: "Ethan Brooks", team: "Engineering" },
  { name: "Riley Grant", team: "Support Operations" },
  { name: "Tara Singh", team: "Support Operations" },
  { name: "Owen Clarke", team: "Platform Engineering" },
  { name: "Yuna Park", team: "Platform Engineering" },
  { name: "Chloe Martin", team: "Frontend Engineering" },
  { name: "Leo Bennett", team: "Frontend Engineering" },
];

const TEAMS = Array.from(new Set(TEAM_MEMBERS.map((member) => member.team)));
const TASK_STATUSES = ["open", "in_progress", "waiting", "completed"];

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
}

function membersForTeam(team?: string | null) {
  const matches = TEAM_MEMBERS.filter((member) => member.team === team);
  return matches.length ? matches : TEAM_MEMBERS;
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200";
  if (normalized === "waiting") return "border-amber-400/30 bg-amber-400/10 text-amber-700 dark:text-amber-200";
  if (normalized === "in_progress") return "border-blue-400/30 bg-blue-400/10 text-blue-700 dark:text-blue-200";
  return "border-sky-400/30 bg-sky-400/10 text-sky-700 dark:text-sky-200";
}

export function TaskDetailsPage() {
  const { taskId } = useParams();
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "open",
    due_at: "",
    assigned_team: "",
  });

  async function refresh() {
    try {
      const nextState = await fetchState();
      setState(nextState);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const task = useMemo(() => state?.tasks.find((item) => item.id === taskId) || null, [state?.tasks, taskId]);
  const supportCase = useMemo(
    () => (task?.case_id ? state?.cases.find((item) => item.id === task.case_id) || null : null),
    [state?.cases, task?.case_id]
  );
  const customer = useMemo(
    () => (task?.customer_id ? state?.customers.find((item) => item.id === task.customer_id) || null : null),
    [state?.customers, task?.customer_id]
  );

  useEffect(() => {
    if (!task) return;
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "medium",
      status: task.status || "open",
      due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : "",
      assigned_team: task.assigned_team || "",
    });
  }, [task]);

  async function saveTask(currentTask: Task) {
    await updateTask(currentTask.id, {
      title: editForm.title,
      description: editForm.description || null,
      priority: editForm.priority,
      status: editForm.status,
      due_at: editForm.due_at ? new Date(editForm.due_at).toISOString() : null,
      assigned_team: editForm.assigned_team || null,
    });
    await refresh();
  }

  async function assignTask(currentTask: Task, assignedMember: string) {
    await updateTaskAssignment(currentTask.id, assignedMember || null);
    await refresh();
  }

  if (error) {
    return <div className="p-5 text-sm text-rose-500 dark:text-rose-300">{error}</div>;
  }

  if (!task) {
    return <div className="p-5 text-sm text-[var(--tf-text-muted)]">{state ? "Task not found." : "Loading task..."}</div>;
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] bg-[var(--tf-bg)] xl:grid-cols-[1fr_340px]">
      <section className="min-w-0 border-r border-[var(--tf-border)]">
        <div className="border-b border-[var(--tf-border)] bg-[var(--tf-surface)] px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Task</p>
              <h1 className="mt-1 truncate text-lg font-semibold text-[var(--tf-text)]">{task.title}</h1>
            </div>
            {supportCase ? (
              <Link
                to={`/cases/${supportCase.id}`}
                className="rounded-md border border-[var(--tf-border)] px-3 py-1.5 text-sm text-[var(--tf-text-soft)] hover:bg-[var(--tf-row-hover)]"
              >
                Open case
              </Link>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-4">
            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="text-xs uppercase text-[var(--tf-text-muted)]">Title</span>
                <input
                  value={editForm.title}
                  onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                  className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-xs uppercase text-[var(--tf-text-muted)]">Description</span>
                <textarea
                  rows={7}
                  value={editForm.description}
                  onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                  className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm leading-6 text-[var(--tf-text)]"
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs uppercase text-[var(--tf-text-muted)]">Status</span>
                  <select
                    value={editForm.status}
                    onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                    className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs uppercase text-[var(--tf-text-muted)]">Priority</span>
                  <select
                    value={editForm.priority}
                    onChange={(event) => setEditForm((current) => ({ ...current, priority: event.target.value }))}
                    className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
                  >
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs uppercase text-[var(--tf-text-muted)]">Assigned team</span>
                  <select
                    value={editForm.assigned_team}
                    onChange={(event) => setEditForm((current) => ({ ...current, assigned_team: event.target.value }))}
                    className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
                  >
                    <option value="">Unassigned</option>
                    {TEAMS.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2">
                  <span className="text-xs uppercase text-[var(--tf-text-muted)]">Due date</span>
                  <input
                    type="datetime-local"
                    value={editForm.due_at}
                    onChange={(event) => setEditForm((current) => ({ ...current, due_at: event.target.value }))}
                    className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void saveTask(task)}
                className="w-fit rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Save task
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="bg-[var(--tf-surface-muted)] p-5">
        <div className="space-y-4">
          <div className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-4">
            <p className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Status</p>
            <span className={`mt-3 inline-flex rounded-md border px-2 py-1 text-xs ${statusClass(task.status)}`}>
              {task.status.replace("_", " ")}
            </span>
          </div>

          <div className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-4">
            <p className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Assignment</p>
            <select
              value={task.assigned_member || ""}
              onChange={(event) => void assignTask(task, event.target.value)}
              className="mt-3 w-full rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
            >
              <option value="">Unassigned</option>
              {membersForTeam(editForm.assigned_team).map((member) => (
                <option key={member.name} value={member.name}>
                  {member.name} · {member.team}
                </option>
              ))}
            </select>
          </div>

          <div className="divide-y divide-[var(--tf-border)] rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)]">
            <div className="flex justify-between gap-3 px-3 py-2.5 text-xs">
              <span className="text-[var(--tf-text-muted)]">Team</span>
              <span className="text-[var(--tf-text)]">{task.assigned_team || "Unassigned"}</span>
            </div>
            <div className="flex justify-between gap-3 px-3 py-2.5 text-xs">
              <span className="text-[var(--tf-text-muted)]">Due</span>
              <span className="text-[var(--tf-text)]">{formatDate(task.due_at)}</span>
            </div>
            <div className="flex justify-between gap-3 px-3 py-2.5 text-xs">
              <span className="text-[var(--tf-text-muted)]">Customer</span>
              <span className="text-[var(--tf-text)]">{customer?.name || customer?.email || "Not linked"}</span>
            </div>
            <div className="flex justify-between gap-3 px-3 py-2.5 text-xs">
              <span className="text-[var(--tf-text-muted)]">Case</span>
              <span className="text-right text-[var(--tf-text)]">{supportCase?.title || "Not linked"}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
