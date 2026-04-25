import { useEffect, useMemo, useState } from "react";
import { fetchState, updateTask, updateTaskAssignment } from "../api";
import { StateResponse, Task } from "../types";

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
  if (!value) return "No due date";
  return new Date(value).toLocaleString();
}

function membersForTeam(team?: string | null) {
  const matches = TEAM_MEMBERS.filter((member) => member.team === team);
  return matches.length > 0 ? matches : TEAM_MEMBERS;
}

export function TasksPage() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
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
      setState(await fetchState());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const tasks = useMemo(() => {
    const allTasks = [...(state?.tasks || [])].sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    return teamFilter === "all" ? allTasks : allTasks.filter((task) => task.assigned_team === teamFilter);
  }, [state?.tasks, teamFilter]);

  const teams = useMemo(
    () => Array.from(new Set((state?.tasks || []).map((task) => task.assigned_team).filter(Boolean))) as string[],
    [state?.tasks]
  );

  async function assignTask(task: Task, assignedMember: string) {
    await updateTaskAssignment(task.id, assignedMember);
    await refresh();
  }

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "medium",
      status: task.status || "open",
      due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : "",
      assigned_team: task.assigned_team || "",
    });
  }

  async function saveTask(task: Task) {
    await updateTask(task.id, {
      title: editForm.title,
      description: editForm.description || null,
      priority: editForm.priority,
      status: editForm.status,
      due_at: editForm.due_at ? new Date(editForm.due_at).toISOString() : null,
      assigned_team: editForm.assigned_team || null,
    });
    setEditingTaskId(null);
    await refresh();
  }

  return (
    <div className="space-y-4 p-5">
      <section className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-6  ">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Task List</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--tf-text)] ">Assign follow-up work to the responsible team member.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">
              Every task stays linked to its case and customer. Use this page to review incoming work, filter by team,
              and assign it to the responsible operator.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md border border-[var(--tf-border)] px-4 py-2 text-sm text-[var(--tf-text)] hover:bg-[var(--tf-surface-muted)]   dark:hover:bg-[var(--tf-surface)]/10"
          >
            Refresh
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTeamFilter("all")}
            className={`rounded-md px-4 py-2 text-sm ${
              teamFilter === "all"
                ? "bg-slate-950 text-white  dark:text-[var(--tf-text)]"
                : "border border-[var(--tf-border)] text-[var(--tf-text-soft)] hover:bg-[var(--tf-surface-muted)]  dark:text-[var(--tf-text-soft)] dark:hover:bg-[var(--tf-surface)]/10"
            }`}
          >
            All teams
          </button>
          {teams.map((team) => (
            <button
              key={team}
              type="button"
              onClick={() => setTeamFilter(team)}
              className={`rounded-md px-4 py-2 text-sm ${
                teamFilter === team
                  ? "bg-slate-950 text-white  dark:text-[var(--tf-text)]"
                  : "border border-[var(--tf-border)] text-[var(--tf-text-soft)] hover:bg-[var(--tf-surface-muted)]  dark:text-[var(--tf-text-soft)] dark:hover:bg-[var(--tf-surface)]/10"
              }`}
            >
              {team}
            </button>
          ))}
        </div>
        {error ? <p className="mt-4 text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
      </section>

      <section className="space-y-4">
        {tasks.length === 0 ? (
          <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-6 text-sm text-[var(--tf-text-muted)]   dark:text-[var(--tf-text-muted)]">
            No tasks available for this filter.
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-6  "
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                      {task.assigned_team || "Unassigned team"}
                    </span>
                    <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                      {task.priority} priority
                    </span>
                    <span
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        task.status === "completed"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                      }`}
                    >
                      {task.status}
                    </span>
                    {task.issue_category ? (
                      <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                        {task.issue_category}
                      </span>
                    ) : null}
                  </div>
                  <div>
                    {editingTaskId === task.id ? (
                      <div className="space-y-3">
                        <input
                          value={editForm.title}
                          onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                          className="w-full rounded-xl border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]   "
                        />
                        <textarea
                          rows={4}
                          value={editForm.description}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, description: event.target.value }))
                          }
                          className="w-full rounded-xl border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]   "
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                          <select
                            value={editForm.priority}
                            onChange={(event) => setEditForm((current) => ({ ...current, priority: event.target.value }))}
                            className="rounded-xl border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]   "
                          >
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                          </select>
                          <select
                            value={editForm.status}
                            onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                            className="rounded-xl border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]   "
                          >
                            {TASK_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status.replace("_", " ")}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <select
                            value={editForm.assigned_team}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, assigned_team: event.target.value }))
                            }
                            className="rounded-xl border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]   "
                          >
                            <option value="">Unassigned team</option>
                            {TEAMS.map((team) => (
                              <option key={team} value={team}>
                                {team}
                              </option>
                            ))}
                          </select>
                          <input
                            type="datetime-local"
                            value={editForm.due_at}
                            onChange={(event) => setEditForm((current) => ({ ...current, due_at: event.target.value }))}
                            className="rounded-xl border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]   "
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold text-[var(--tf-text)] ">{task.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">
                          {task.description || "No task notes available."}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="grid gap-3 text-sm text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)] md:grid-cols-3">
                    <p>Created: {formatDate(task.created_at)}</p>
                    <p>Due: {formatDate(task.due_at)}</p>
                    <p>Current owner: {task.assigned_member || "Not assigned"}</p>
                  </div>
                  <div className="flex gap-2">
                    {editingTaskId === task.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void saveTask(task)}
                          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white  dark:text-[var(--tf-text)]"
                        >
                          Save task
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(null)}
                          className="rounded-md border border-[var(--tf-border)] px-4 py-2 text-sm text-[var(--tf-text-soft)]  dark:text-[var(--tf-text-soft)]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditing(task)}
                        className="rounded-md border border-[var(--tf-border)] px-4 py-2 text-sm text-[var(--tf-text-soft)]  dark:text-[var(--tf-text-soft)]"
                      >
                        Edit task
                      </button>
                    )}
                  </div>
                </div>

                <div className="w-full max-w-sm rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-4  dark:bg-[var(--tf-surface-muted)]">
                  <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)]">Assign to team member</p>
                  <select
                    value={task.assigned_member || ""}
                    onChange={(event) => void assignTask(task, event.target.value)}
                    className="mt-3 w-full rounded-xl border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]   "
                  >
                    <option value="">Unassigned</option>
                    {membersForTeam(task.assigned_team).map((member) => (
                      <option key={member.name} value={member.name}>
                        {member.name} · {member.team}
                      </option>
                    ))}
                  </select>
                  <p className="mt-3 text-xs leading-5 text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">
                    Team assignment stays automatic from classification. You can override the responsible member here.
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
