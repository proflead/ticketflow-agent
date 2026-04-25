import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchState, updateTask, updateTaskAssignment } from "../api";
import type { Customer, StateResponse, SupportCase, Task } from "../types";

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
type TaskFilter = "all" | "open" | "in_progress" | "waiting" | "completed" | "unassigned" | "high";

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
}

function compactDate(value?: string | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function titleCase(value?: string | null) {
  if (!value) return "Unassigned";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function caseCode(id?: string | null) {
  return id ? `TF-${id.slice(0, 4).toUpperCase()}` : "No case";
}

function membersForTeam(team?: string | null) {
  const matches = TEAM_MEMBERS.filter((member) => member.team === team);
  return matches.length ? matches : TEAM_MEMBERS;
}

function statusClass(value?: string | null) {
  const normalized = value?.toLowerCase();
  if (normalized === "completed") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200";
  if (normalized === "waiting") return "border-amber-400/25 bg-amber-400/10 text-amber-700 dark:text-amber-200";
  if (normalized === "in_progress") return "border-blue-400/25 bg-blue-400/10 text-blue-700 dark:text-blue-200";
  return "border-sky-400/25 bg-sky-400/10 text-sky-700 dark:text-sky-200";
}

function priorityClass(value?: string | null) {
  if (value === "high") return "border-rose-400/25 bg-rose-400/10 text-rose-700 dark:text-rose-200";
  if (value === "medium") return "border-blue-400/25 bg-blue-400/10 text-blue-700 dark:text-blue-200";
  return "border-[var(--tf-border)] bg-[var(--tf-surface-muted)] text-[var(--tf-text-soft)]";
}

function Badge({ value, className }: { value: string; className?: string }) {
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${className || ""}`}>{value}</span>;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--tf-border)] px-3 py-2.5 last:border-b-0">
      <span className="text-xs text-[var(--tf-text-muted)]">{label}</span>
      <span className="max-w-[210px] truncate text-right text-xs font-medium text-[var(--tf-text)]">{value}</span>
    </div>
  );
}

function customerLabel(customer?: Customer | null) {
  return customer?.name || customer?.email || "Unknown customer";
}

function taskSortValue(task: Task) {
  const statusWeight = task.status === "completed" ? 0 : task.status === "waiting" ? 1 : task.status === "in_progress" ? 3 : 4;
  const priorityWeight = task.priority === "high" ? 3 : task.priority === "medium" ? 2 : 1;
  const dueTime = task.due_at ? new Date(task.due_at).getTime() : 0;
  return statusWeight * 10_000_000_000_000 + priorityWeight * 1_000_000_000_000 - dueTime;
}

export function TasksPage() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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
      setSelectedTaskId((current) => current || nextState.tasks.find((task) => task.status !== "completed")?.id || nextState.tasks[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const casesById = useMemo(() => new Map((state?.cases || []).map((supportCase) => [supportCase.id, supportCase])), [state?.cases]);
  const customersById = useMemo(() => new Map((state?.customers || []).map((customer) => [customer.id, customer])), [state?.customers]);

  const sortedTasks = useMemo(
    () => [...(state?.tasks || [])].sort((a, b) => taskSortValue(b) - taskSortValue(a)),
    [state?.tasks]
  );

  const filteredTasks = useMemo(() => {
    return sortedTasks.filter((task) => {
      if (filter === "unassigned") return !task.assigned_member;
      if (filter === "high") return task.priority === "high";
      if (filter === "all") return true;
      return task.status === filter;
    });
  }, [filter, sortedTasks]);

  const selectedTask = useMemo(() => {
    if (!filteredTasks.length) return null;
    return filteredTasks.find((task) => task.id === selectedTaskId) || filteredTasks[0];
  }, [filteredTasks, selectedTaskId]);

  const selectedCase = selectedTask?.case_id ? casesById.get(selectedTask.case_id) || null : null;
  const selectedCustomer = selectedTask?.customer_id
    ? customersById.get(selectedTask.customer_id) || null
    : selectedCase?.customer_id
      ? customersById.get(selectedCase.customer_id) || null
      : null;

  const openCount = (state?.tasks || []).filter((task) => task.status !== "completed").length;
  const unassignedCount = (state?.tasks || []).filter((task) => !task.assigned_member).length;
  const highCount = (state?.tasks || []).filter((task) => task.priority === "high").length;

  useEffect(() => {
    if (!selectedTask) return;
    setEditForm({
      title: selectedTask.title,
      description: selectedTask.description || "",
      priority: selectedTask.priority || "medium",
      status: selectedTask.status || "open",
      due_at: selectedTask.due_at ? new Date(selectedTask.due_at).toISOString().slice(0, 16) : "",
      assigned_team: selectedTask.assigned_team || "",
    });
  }, [selectedTask]);

  async function saveSelectedTask() {
    if (!selectedTask) return;
    await updateTask(selectedTask.id, {
      title: editForm.title,
      description: editForm.description || null,
      priority: editForm.priority,
      status: editForm.status,
      due_at: editForm.due_at ? new Date(editForm.due_at).toISOString() : null,
      assigned_team: editForm.assigned_team || null,
    });
    await refresh();
  }

  async function assignSelectedTask(assignedMember: string) {
    if (!selectedTask) return;
    await updateTaskAssignment(selectedTask.id, assignedMember || null);
    await refresh();
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[var(--tf-bg)]">
      <div className="border-b border-[var(--tf-border)] bg-[var(--tf-surface)] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold text-[var(--tf-text)]">Tasks</h1>
            <p className="text-xs text-[var(--tf-text-muted)]">
              {openCount} open · {unassignedCount} unassigned · {highCount} high priority
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md border border-[var(--tf-border)] px-3 py-1.5 text-sm text-[var(--tf-text-soft)] hover:bg-[var(--tf-row-hover)]"
          >
            Refresh
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
      </div>

      <div className="grid min-h-[calc(100vh-7.25rem)] xl:grid-cols-[380px_minmax(440px,1fr)_340px]">
        <aside className="border-r border-[var(--tf-border)] bg-[var(--tf-surface)]">
          <div className="border-b border-[var(--tf-border)] p-3">
            <div className="flex flex-wrap gap-1">
              {[
                ["all", "All"],
                ["open", "Open"],
                ["in_progress", "In progress"],
                ["waiting", "Waiting"],
                ["completed", "Done"],
                ["unassigned", "Unassigned"],
                ["high", "High"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as TaskFilter)}
                  className={`rounded-md px-2.5 py-1.5 text-xs ${
                    filter === value
                      ? "bg-[var(--tf-row-active)] text-[var(--tf-text)]"
                      : "text-[var(--tf-text-muted)] hover:bg-[var(--tf-row-hover)] hover:text-[var(--tf-text-soft)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[calc(100vh-10.25rem)] overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="p-4 text-sm text-[var(--tf-text-muted)]">No tasks match this view.</div>
            ) : (
              filteredTasks.map((task) => {
                const active = task.id === selectedTask?.id;
                const supportCase = task.case_id ? casesById.get(task.case_id) : null;
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full border-b border-[var(--tf-border)] px-4 py-3 text-left transition ${
                      active ? "bg-[var(--tf-row-active)]" : "hover:bg-[var(--tf-row-hover)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge value={titleCase(task.status)} className={statusClass(task.status)} />
                      <Badge value={titleCase(task.priority)} className={priorityClass(task.priority)} />
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-sm font-medium text-[var(--tf-text)]">{task.title}</h2>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--tf-text-muted)]">
                      <span className="truncate">{task.assigned_member || task.assigned_team || "Unassigned"}</span>
                      <span>{compactDate(task.due_at)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-md border border-[var(--tf-border)] px-2 py-0.5 text-xs text-[var(--tf-text-muted)]">
                        {caseCode(task.case_id)}
                      </span>
                      <span className="rounded-md border border-[var(--tf-border)] px-2 py-0.5 text-xs text-[var(--tf-text-muted)]">
                        {supportCase?.assigned_team || task.assigned_team || "No team"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="min-w-0 border-r border-[var(--tf-border)] bg-[var(--tf-bg)]">
          {selectedTask ? (
            <>
              <div className="border-b border-[var(--tf-border)] bg-[var(--tf-surface)] px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--tf-text-muted)]">{caseCode(selectedTask.case_id)}</p>
                    <h2 className="mt-1 text-lg font-semibold text-[var(--tf-text)]">{selectedTask.title}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge value={titleCase(selectedTask.status)} className={statusClass(selectedTask.status)} />
                      <Badge value={titleCase(selectedTask.priority)} className={priorityClass(selectedTask.priority)} />
                      <span className="rounded-md border border-[var(--tf-border)] px-2 py-0.5 text-xs text-[var(--tf-text-muted)]">
                        {selectedTask.assigned_team || "Unassigned team"}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/tasks/${selectedTask.id}`}
                    className="rounded-md border border-[var(--tf-border)] px-3 py-1.5 text-sm text-[var(--tf-text-soft)] hover:bg-[var(--tf-row-hover)]"
                  >
                    Open detail
                  </Link>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <section className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-4">
                  <div className="grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Title</span>
                      <input
                        value={editForm.title}
                        onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                        className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Description</span>
                      <textarea
                        rows={7}
                        value={editForm.description}
                        onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                        className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm leading-6 text-[var(--tf-text)]"
                      />
                    </label>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Status</span>
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
                        <span className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Priority</span>
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
                        <span className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Assigned team</span>
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
                        <span className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Due date</span>
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
                      onClick={() => void saveSelectedTask()}
                      className="w-fit rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                    >
                      Save task
                    </button>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="p-5 text-sm text-[var(--tf-text-muted)]">Select a task to inspect it.</div>
          )}
        </main>

        <aside className="bg-[var(--tf-surface-muted)]">
          <div className="border-b border-[var(--tf-border)] bg-[var(--tf-surface)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--tf-text)]">Context</h3>
            <p className="text-xs text-[var(--tf-text-muted)]">Owner, case, customer</p>
          </div>
          <div className="max-h-[calc(100vh-10.25rem)] space-y-4 overflow-y-auto p-4">
            {selectedTask ? (
              <>
                <section className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-3">
                  <p className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Assignee</p>
                  <select
                    value={selectedTask.assigned_member || ""}
                    onChange={(event) => void assignSelectedTask(event.target.value)}
                    className="mt-3 w-full rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
                  >
                    <option value="">Unassigned</option>
                    {membersForTeam(editForm.assigned_team).map((member) => (
                      <option key={member.name} value={member.name}>
                        {member.name} · {member.team}
                      </option>
                    ))}
                  </select>
                </section>

                <section className="divide-y divide-[var(--tf-border)] rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)]">
                  <MetricRow label="Team" value={selectedTask.assigned_team || "Unassigned"} />
                  <MetricRow label="Member" value={selectedTask.assigned_member || "Unassigned"} />
                  <MetricRow label="Due" value={formatDate(selectedTask.due_at)} />
                  <MetricRow label="Created" value={formatDate(selectedTask.created_at)} />
                </section>

                <section className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-3">
                  <p className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Linked case</p>
                  {selectedCase ? (
                    <div className="mt-3">
                      <p className="line-clamp-3 text-sm font-medium text-[var(--tf-text)]">{selectedCase.title}</p>
                      <p className="mt-2 text-xs text-[var(--tf-text-muted)]">
                        {selectedCase.assigned_team || "Unassigned"} · {titleCase(selectedCase.status)}
                      </p>
                      <Link
                        to={`/cases/${selectedCase.id}`}
                        className="mt-3 inline-flex rounded-md border border-[var(--tf-border)] px-3 py-1.5 text-sm text-[var(--tf-text-soft)] hover:bg-[var(--tf-row-hover)]"
                      >
                        Open case
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-[var(--tf-text-muted)]">No case linked.</p>
                  )}
                </section>

                <section className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-3">
                  <p className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Customer</p>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="text-[var(--tf-text)]">{customerLabel(selectedCustomer)}</p>
                    <p className="text-[var(--tf-text-muted)]">{selectedCustomer?.email || "No email captured"}</p>
                    <p className="text-[var(--tf-text-muted)]">{selectedCustomer?.phone || "No phone captured"}</p>
                  </div>
                </section>

                {selectedCase?.source_text ? (
                  <section className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-3">
                    <p className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Source transcript</p>
                    <p className="mt-3 line-clamp-6 text-sm leading-6 text-[var(--tf-text-soft)]">{selectedCase.source_text}</p>
                  </section>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-[var(--tf-text-muted)]">No task selected.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
