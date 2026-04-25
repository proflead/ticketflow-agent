import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchCaseDetail, updateCase, updateTask, updateTaskAssignment } from "../api";
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

const TEAMS = Array.from(new Set(TEAM_MEMBERS.map((member) => member.team)));
const TASK_STATUSES = ["open", "in_progress", "waiting", "completed"];
const CASE_STATUSES = ["open", "in_progress", "waiting", "resolved", "closed"];
const SEVERITIES = ["low", "medium", "high", "critical"];

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
    assigned_team: "",
  });
  const [caseForm, setCaseForm] = useState({
    assigned_team: "",
    issue_category: "",
    severity: "medium",
    status: "open",
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

  useEffect(() => {
    if (!detail?.case) return;
    setCaseForm({
      assigned_team: detail.case.assigned_team || "",
      issue_category: detail.case.issue_category || "",
      severity: detail.case.severity || "medium",
      status: detail.case.status || "open",
    });
  }, [detail?.case]);

  const sortedTasks = useMemo(
    () =>
      [...(detail?.tasks || [])].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      ),
    [detail?.tasks]
  );

  const latestRun = detail?.workflow_runs?.[0];
  const latestSteps = latestRun?.steps_json || [];

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

  async function saveCaseRouting() {
    if (!detail) return;
    await updateCase(detail.case.id, {
      assigned_team: caseForm.assigned_team || null,
      issue_category: caseForm.issue_category || null,
      severity: caseForm.severity,
      status: caseForm.status,
    });
    await refresh();
  }

  async function assignTask(task: Task, assignedMember: string) {
    await updateTaskAssignment(task.id, assignedMember || null);
    await refresh();
  }

  if (!caseId) {
    return <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-5 text-sm text-[var(--tf-text-soft)]   dark:text-[var(--tf-text-soft)]">Missing case id.</div>;
  }

  return (
    <div className="space-y-4 p-5">
      <section className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-5  ">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Case Command View</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--tf-text)] ">
              {detail?.case.title || "Loading support case"}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">
              Inspect the full customer conversation, linked customer record, current routing, and every follow-up task
              attached to this support case.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/records"
              className="rounded-md border border-[var(--tf-border)] px-4 py-2 text-sm text-[var(--tf-text-soft)] hover:bg-[var(--tf-surface-muted)]  dark:text-[var(--tf-text-soft)] dark:hover:bg-[var(--tf-surface)]/10"
            >
              Back to support cases
            </Link>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-md border border-[var(--tf-border)] px-4 py-2 text-sm text-[var(--tf-text-soft)] hover:bg-[var(--tf-surface-muted)]  dark:text-[var(--tf-text-soft)] dark:hover:bg-[var(--tf-surface)]/10"
            >
              Refresh
            </button>
          </div>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
      </section>

      {detail ? (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-5  ">
              <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Conversation Record</p>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">
                {detail.case.source_text}
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-5  ">
                <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Routing</p>
                <div className="mt-4 grid gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs uppercase text-[var(--tf-text-muted)]">Assigned team</span>
                    <select
                      value={caseForm.assigned_team}
                      onChange={(event) => setCaseForm((current) => ({ ...current, assigned_team: event.target.value }))}
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
                    <span className="text-xs uppercase text-[var(--tf-text-muted)]">Issue category</span>
                    <input
                      value={caseForm.issue_category}
                      onChange={(event) => setCaseForm((current) => ({ ...current, issue_category: event.target.value }))}
                      className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs uppercase text-[var(--tf-text-muted)]">Severity</span>
                      <select
                        value={caseForm.severity}
                        onChange={(event) => setCaseForm((current) => ({ ...current, severity: event.target.value }))}
                        className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
                      >
                        {SEVERITIES.map((severity) => (
                          <option key={severity} value={severity}>
                            {severity}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs uppercase text-[var(--tf-text-muted)]">Status</span>
                      <select
                        value={caseForm.status}
                        onChange={(event) => setCaseForm((current) => ({ ...current, status: event.target.value }))}
                        className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]"
                      >
                        {CASE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => void saveCaseRouting()}
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                  >
                    Save routing
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-500/20 bg-emerald-50 p-5 dark:bg-emerald-500/10">
                <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-200">Next Best Action</p>
                <p className="mt-4 text-sm leading-7 text-emerald-950 dark:text-emerald-100">
                  {detail.suggested_next_action || "Assign an owner, review open tasks, and send the customer a status update."}
                </p>
              </div>

              <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-5  ">
                <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Customer</p>
                {detail.customer ? (
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-md border border-[var(--tf-border)] p-4 ">
                      <p className="text-xs uppercase text-[var(--tf-text-muted)]">Name</p>
                      <p className="mt-2 text-sm text-[var(--tf-text)] ">{detail.customer.name || "Not captured"}</p>
                    </div>
                    <div className="rounded-md border border-[var(--tf-border)] p-4 ">
                      <p className="text-xs uppercase text-[var(--tf-text-muted)]">Email</p>
                      <p className="mt-2 text-sm text-[var(--tf-text)] ">{detail.customer.email || "Not captured"}</p>
                    </div>
                    <div className="rounded-md border border-[var(--tf-border)] p-4 ">
                      <p className="text-xs uppercase text-[var(--tf-text-muted)]">Phone</p>
                      <p className="mt-2 text-sm text-[var(--tf-text)] ">{detail.customer.phone || "Not captured"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">No customer linked to this case.</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-5  ">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Task Queue</p>
                <h3 className="mt-1 text-xl font-semibold text-[var(--tf-text)] ">Follow-up work for this case</h3>
              </div>
              <span className="rounded-md border border-[var(--tf-border)] px-3 py-1 text-xs text-[var(--tf-text-muted)]  dark:text-[var(--tf-text-soft)]">
                {sortedTasks.length} tasks
              </span>
            </div>

            <div className="mt-6 space-y-4">
              {sortedTasks.length === 0 ? (
                <p className="text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">No tasks linked to this case yet.</p>
              ) : (
                sortedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)]"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                            {task.assigned_team || "Unassigned"}
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
                        </div>
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
                              onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
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
                            <h4 className="text-lg font-semibold text-[var(--tf-text)] ">{task.title}</h4>
                            <p className="text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">
                              {task.description || "No task notes available."}
                            </p>
                          </>
                        )}
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

                      <div className="w-full max-w-sm rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-4  ">
                        <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)]">Assign to team member</p>
                        <select
                          value={task.assigned_member || ""}
                          onChange={(event) => void assignTask(task, event.target.value)}
                          className="mt-3 w-full rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-sm text-[var(--tf-text)]   "
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

          <section className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-5  ">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Agent Timeline</p>
                <h3 className="mt-1 text-xl font-semibold text-[var(--tf-text)] ">Specialist actions and MCP tool calls</h3>
              </div>
              {latestRun?.engine_mode ? (
                <span
                  className={`rounded-md px-3 py-1 text-xs font-semibold ${
                    latestRun.engine_mode === "gemini_adk"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-200"
                  }`}
                >
                  {latestRun.engine_mode === "gemini_adk" ? "Gemini ADK" : "Heuristic Fallback"}
                </span>
              ) : null}
            </div>

            <ol className="mt-6 space-y-3">
              {latestSteps.length === 0 ? (
                <li className="text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">No MCP steps were recorded for the latest run.</li>
              ) : (
                latestSteps.map((step, index) => (
                  <li key={`${step.agent}-${index}`} className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-4  dark:bg-[var(--tf-surface-muted)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm text-[var(--tf-text)] ">{step.agent}</strong>
                      <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">{step.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{step.action}</p>
                    {step.tool_name ? <p className="mt-2 text-xs font-semibold text-[var(--tf-text-muted)]">MCP tool: {step.tool_name}</p> : null}
                  </li>
                ))
              )}
            </ol>
          </section>

          <section className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-5  ">
            <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Run Logs</p>
            <div className="mt-4 space-y-3">
              {detail.workflow_runs.length === 0 ? (
                <p className="text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">No run logs for this case yet.</p>
              ) : (
                detail.workflow_runs.map((run) => (
                  <div key={run.id} className="rounded-lg border border-[var(--tf-border)] p-4 ">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                        {run.status}
                      </span>
                      {run.engine_mode ? (
                        <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                          {run.engine_mode}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm text-[var(--tf-text)] ">{run.summary || "No summary saved."}</p>
                    <p className="mt-2 text-xs text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Created: {formatDate(run.created_at)}</p>
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
