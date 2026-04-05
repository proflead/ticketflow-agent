import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchCaseDetail, updateTask, updateTaskAssignment } from "../api";
import { CaseDetailResponse, Task } from "../types";

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

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}

function membersForTeam(team?: string | null) {
  const matches = TEAM_MEMBERS.filter((member) => member.team === team);
  return matches.length > 0 ? matches : TEAM_MEMBERS;
}

export function CaseDetailsPage() {
  const { caseId } = useParams();
  const [detail, setDetail] = useState<CaseDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "open",
    due_at: "",
  });

  async function refresh() {
    if (!caseId) return;
    try {
      setDetail(await fetchCaseDetail(caseId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    void refresh();
  }, [caseId]);

  const sortedTasks = useMemo(
    () =>
      [...(detail?.tasks || [])].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      ),
    [detail?.tasks]
  );

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "medium",
      status: task.status || "open",
      due_at: task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : "",
    });
  }

  async function saveTask(task: Task) {
    await updateTask(task.id, {
      title: editForm.title,
      description: editForm.description || null,
      priority: editForm.priority,
      status: editForm.status,
      due_at: editForm.due_at ? new Date(editForm.due_at).toISOString() : null,
    });
    setEditingTaskId(null);
    await refresh();
  }

  async function assignTask(task: Task, assignedMember: string) {
    await updateTaskAssignment(task.id, assignedMember || null);
    await refresh();
  }

  if (!caseId) {
    return <div className="rounded-3xl border border-black/10 bg-white/90 p-6 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300">Missing case id.</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Case Details</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">
              {detail?.case.title || "Loading support case"}
            </h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Inspect the full customer conversation, linked customer record, current routing, and every follow-up task
              attached to this support case.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/records"
              className="rounded-full border border-black/10 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              Back to support cases
            </Link>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full border border-black/10 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              Refresh
            </button>
          </div>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
      </section>

      {detail ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Conversation</p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
                {detail.case.source_text}
              </p>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Routing</p>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Assigned team</p>
                    <p className="mt-2 text-sm text-slate-950 dark:text-white">{detail.case.assigned_team || "Not assigned"}</p>
                  </div>
                  <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Issue category</p>
                    <p className="mt-2 text-sm text-slate-950 dark:text-white">{detail.case.issue_category || "Not classified"}</p>
                  </div>
                  <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Severity</p>
                    <p className="mt-2 text-sm text-slate-950 dark:text-white">{detail.case.severity || "medium"}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Customer</p>
                {detail.customer ? (
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Name</p>
                      <p className="mt-2 text-sm text-slate-950 dark:text-white">{detail.customer.name || "Not captured"}</p>
                    </div>
                    <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
                      <p className="mt-2 text-sm text-slate-950 dark:text-white">{detail.customer.email || "Not captured"}</p>
                    </div>
                    <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Phone</p>
                      <p className="mt-2 text-sm text-slate-950 dark:text-white">{detail.customer.phone || "Not captured"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No customer linked to this case.</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Tasks</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Follow-up work for this case</h3>
              </div>
              <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
                {sortedTasks.length} tasks
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {sortedTasks.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No tasks linked to this case yet.</p>
              ) : (
                sortedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl border border-black/10 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-slate-950/50"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {task.assigned_team || "Unassigned"}
                          </span>
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {task.priority} priority
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              task.status === "completed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                        {editingTaskId === task.id ? (
                          <div className="space-y-3">
                            <input
                              value={editForm.title}
                              onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                            />
                            <textarea
                              rows={4}
                              value={editForm.description}
                              onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                            />
                            <div className="grid gap-3 md:grid-cols-3">
                              <select
                                value={editForm.priority}
                                onChange={(event) => setEditForm((current) => ({ ...current, priority: event.target.value }))}
                                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                              >
                                <option value="low">low</option>
                                <option value="medium">medium</option>
                                <option value="high">high</option>
                              </select>
                              <select
                                value={editForm.status}
                                onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                              >
                                <option value="open">open</option>
                                <option value="completed">completed</option>
                              </select>
                              <input
                                type="datetime-local"
                                value={editForm.due_at}
                                onChange={(event) => setEditForm((current) => ({ ...current, due_at: event.target.value }))}
                                className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <h4 className="text-lg font-semibold text-slate-950 dark:text-white">{task.title}</h4>
                            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                              {task.description || "No task notes available."}
                            </p>
                          </>
                        )}
                        <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-3">
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
                                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                              >
                                Save task
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTaskId(null)}
                                className="rounded-full border border-black/10 px-4 py-2 text-sm text-slate-700 dark:border-white/10 dark:text-slate-300"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditing(task)}
                              className="rounded-full border border-black/10 px-4 py-2 text-sm text-slate-700 dark:border-white/10 dark:text-slate-300"
                            >
                              Edit task
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Assign to team member</p>
                        <select
                          value={task.assigned_member || ""}
                          onChange={(event) => void assignTask(task, event.target.value)}
                          className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="">Unassigned</option>
                          {membersForTeam(task.assigned_team).map((member) => (
                            <option key={member.name} value={member.name}>
                              {member.name} · {member.team}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Run Logs</p>
            <div className="mt-4 space-y-3">
              {detail.workflow_runs.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No run logs for this case yet.</p>
              ) : (
                detail.workflow_runs.map((run) => (
                  <div key={run.id} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {run.status}
                      </span>
                      {run.engine_mode ? (
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {run.engine_mode}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-slate-950 dark:text-white">{run.summary || "No summary saved."}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Created: {formatDate(run.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
