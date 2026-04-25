import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { deleteCase, deleteTask, fetchState } from "../api";
import type { Customer, Event, StateResponse, SupportCase, Task } from "../types";

type CaseFilter = "all" | "open" | "high" | "unassigned";

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
}

function compactDate(value?: string | null) {
  if (!value) return "No activity";
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

function caseCode(id: string) {
  return `TF-${id.slice(0, 4).toUpperCase()}`;
}

function statusClass(value?: string | null) {
  const normalized = value?.toLowerCase();
  if (normalized === "resolved" || normalized === "closed" || normalized === "completed") {
    return "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200";
  }
  if (normalized === "waiting") return "border-amber-400/25 bg-amber-400/10 text-amber-700 dark:text-amber-200";
  if (normalized === "in_progress") return "border-blue-400/25 bg-blue-400/10 text-blue-700 dark:text-blue-200";
  return "border-sky-400/25 bg-sky-400/10 text-sky-700 dark:text-sky-200";
}

function severityClass(value?: string | null) {
  const normalized = value?.toLowerCase();
  if (normalized === "critical" || normalized === "high") return "border-rose-400/25 bg-rose-400/10 text-rose-700 dark:text-rose-200";
  if (normalized === "medium") return "border-blue-400/25 bg-blue-400/10 text-blue-700 dark:text-blue-200";
  return "border-[var(--tf-border)] bg-[var(--tf-surface-muted)] text-[var(--tf-text-soft)]";
}

function Badge({ value, className }: { value: string; className?: string }) {
  return <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${className || ""}`}>{value}</span>;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--tf-border)] px-3 py-2.5 last:border-b-0">
      <span className="text-xs text-[var(--tf-text-muted)]">{label}</span>
      <span className="max-w-[220px] truncate text-right text-xs font-medium text-[var(--tf-text)]">{value}</span>
    </div>
  );
}

function latestTime(supportCase: SupportCase, tasks: Task[], events: Event[]) {
  const values = [supportCase.updated_at, ...tasks.map((task) => task.updated_at), ...events.map((event) => event.updated_at)]
    .filter(Boolean)
    .sort();
  return values[values.length - 1] || supportCase.created_at;
}

function nextAction(supportCase: SupportCase, tasks: Task[], event?: Event) {
  const openTask = tasks.find((task) => task.status !== "completed");
  if (openTask) return `Resolve task: ${openTask.title}`;
  if (event) return `Prepare callback for ${formatDate(event.start_at)}.`;
  return `Review ${supportCase.assigned_team || "Support Operations"} ownership and close the loop.`;
}

function customerLabel(customer?: Customer | null) {
  return customer?.name || customer?.email || "Unknown customer";
}

export function RecordsPage() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CaseFilter>("all");

  async function refresh() {
    try {
      const nextState = await fetchState();
      setState(nextState);
      setError(null);
      setSelectedCaseId((current) => current || nextState.cases[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const customersById = useMemo(() => new Map((state?.customers || []).map((customer) => [customer.id, customer])), [state?.customers]);

  const sortedCases = useMemo(
    () =>
      [...(state?.cases || [])].sort(
        (a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
      ),
    [state?.cases]
  );

  const filteredCases = useMemo(() => {
    return sortedCases.filter((supportCase) => {
      if (filter === "open") return !["resolved", "closed"].includes(supportCase.status);
      if (filter === "high") return ["high", "critical"].includes(supportCase.severity || "");
      if (filter === "unassigned") return !supportCase.assigned_team;
      return true;
    });
  }, [filter, sortedCases]);

  const selectedCase = useMemo(() => {
    if (!filteredCases.length) return null;
    return filteredCases.find((supportCase) => supportCase.id === selectedCaseId) || filteredCases[0];
  }, [filteredCases, selectedCaseId]);

  const selectedTasks = useMemo(
    () => (state?.tasks || []).filter((task) => task.case_id === selectedCase?.id),
    [selectedCase?.id, state?.tasks]
  );

  const selectedEvents = useMemo(
    () =>
      (state?.events || [])
        .filter((event) => event.case_id === selectedCase?.id)
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [selectedCase?.id, state?.events]
  );

  const selectedRuns = useMemo(
    () =>
      (state?.workflow_runs || [])
        .filter((run) => run.case_id === selectedCase?.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [selectedCase?.id, state?.workflow_runs]
  );

  const selectedCustomer = selectedCase?.customer_id ? customersById.get(selectedCase.customer_id) : null;
  const openCaseCount = (state?.cases || []).filter((supportCase) => !["resolved", "closed"].includes(supportCase.status)).length;
  const highCaseCount = (state?.cases || []).filter((supportCase) => ["high", "critical"].includes(supportCase.severity || "")).length;

  async function removeSelectedCase() {
    if (!selectedCase) return;
    await deleteCase(selectedCase.id);
    setSelectedCaseId(null);
    await refresh();
  }

  async function removeTask(taskId: string) {
    await deleteTask(taskId);
    await refresh();
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[var(--tf-bg)]">
      <div className="border-b border-[var(--tf-border)] bg-[var(--tf-surface)] px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-semibold text-[var(--tf-text)]">Cases</h1>
            <p className="text-xs text-[var(--tf-text-muted)]">
              {openCaseCount} open · {highCaseCount} high priority · {state?.tasks.length || 0} tasks
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

      <div className="grid min-h-[calc(100vh-7.25rem)] xl:grid-cols-[360px_minmax(420px,1fr)_360px]">
        <aside className="border-r border-[var(--tf-border)] bg-[var(--tf-surface)]">
          <div className="border-b border-[var(--tf-border)] p-3">
            <div className="flex flex-wrap gap-1">
              {[
                ["all", "All"],
                ["open", "Open"],
                ["high", "High"],
                ["unassigned", "Unassigned"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as CaseFilter)}
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
            {filteredCases.length === 0 ? (
              <div className="p-4 text-sm text-[var(--tf-text-muted)]">No cases match this view.</div>
            ) : (
              filteredCases.map((supportCase) => {
                const active = supportCase.id === selectedCase?.id;
                const caseTasks = (state?.tasks || []).filter((task) => task.case_id === supportCase.id);
                const caseEvents = (state?.events || []).filter((event) => event.case_id === supportCase.id);
                const customer = supportCase.customer_id ? customersById.get(supportCase.customer_id) : null;
                return (
                  <button
                    key={supportCase.id}
                    type="button"
                    onClick={() => setSelectedCaseId(supportCase.id)}
                    className={`w-full border-b border-[var(--tf-border)] px-4 py-3 text-left transition ${
                      active ? "bg-[var(--tf-row-active)]" : "hover:bg-[var(--tf-row-hover)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-[var(--tf-text-muted)]">{caseCode(supportCase.id)}</span>
                      <Badge value={titleCase(supportCase.severity)} className={severityClass(supportCase.severity)} />
                    </div>
                    <h2 className="mt-2 line-clamp-2 text-sm font-medium text-[var(--tf-text)]">{supportCase.title}</h2>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[var(--tf-text-muted)]">
                      <span className="truncate">{customerLabel(customer)}</span>
                      <span>{compactDate(latestTime(supportCase, caseTasks, caseEvents))}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge value={titleCase(supportCase.status)} className={statusClass(supportCase.status)} />
                      <span className="rounded-md border border-[var(--tf-border)] px-2 py-0.5 text-xs text-[var(--tf-text-muted)]">
                        {caseTasks.length} tasks
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="min-w-0 border-r border-[var(--tf-border)] bg-[var(--tf-bg)]">
          {selectedCase ? (
            <>
              <div className="border-b border-[var(--tf-border)] bg-[var(--tf-surface)] px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--tf-text-muted)]">{caseCode(selectedCase.id)}</p>
                    <h2 className="mt-1 text-lg font-semibold text-[var(--tf-text)]">{selectedCase.title}</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge value={titleCase(selectedCase.status)} className={statusClass(selectedCase.status)} />
                      <Badge value={titleCase(selectedCase.severity)} className={severityClass(selectedCase.severity)} />
                      <span className="rounded-md border border-[var(--tf-border)] px-2 py-0.5 text-xs text-[var(--tf-text-muted)]">
                        {selectedCase.assigned_team || "Unassigned team"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/cases/${selectedCase.id}`}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                    >
                      Open full case
                    </Link>
                    <button
                      type="button"
                      onClick={() => void removeSelectedCase()}
                      className="rounded-md border border-rose-400/30 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <section className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)]">
                  <div className="border-b border-[var(--tf-border)] px-4 py-3">
                    <h3 className="text-sm font-semibold text-[var(--tf-text)]">Overview</h3>
                  </div>
                  <div className="grid gap-0 divide-y divide-[var(--tf-border)] md:grid-cols-2 md:divide-x md:divide-y-0">
                    <div className="divide-y divide-[var(--tf-border)]">
                      <MetricRow label="Customer" value={customerLabel(selectedCustomer)} />
                      <MetricRow label="Email" value={selectedCustomer?.email || "Not captured"} />
                      <MetricRow label="Team" value={selectedCase.assigned_team || "Unassigned"} />
                    </div>
                    <div className="divide-y divide-[var(--tf-border)]">
                      <MetricRow label="Category" value={selectedCase.issue_category || "General Support"} />
                      <MetricRow label="Created" value={formatDate(selectedCase.created_at)} />
                      <MetricRow label="Updated" value={formatDate(selectedCase.updated_at)} />
                    </div>
                  </div>
                </section>

                <section className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-4">
                  <p className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Conversation</p>
                  <p className="mt-3 line-clamp-[10] whitespace-pre-wrap text-sm leading-6 text-[var(--tf-text-soft)]">
                    {selectedCase.source_text}
                  </p>
                </section>

                <section className="rounded-md border border-blue-400/20 bg-blue-400/[0.06] p-4">
                  <p className="text-xs font-medium uppercase text-blue-700 dark:text-blue-200">Next action</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--tf-text)]">{nextAction(selectedCase, selectedTasks, selectedEvents[0])}</p>
                </section>
              </div>
            </>
          ) : (
            <div className="p-5 text-sm text-[var(--tf-text-muted)]">Select a case to inspect it.</div>
          )}
        </main>

        <aside className="bg-[var(--tf-surface-muted)]">
          <div className="border-b border-[var(--tf-border)] bg-[var(--tf-surface)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--tf-text)]">Linked work</h3>
            <p className="text-xs text-[var(--tf-text-muted)]">Tasks, callback, trace</p>
          </div>
          <div className="max-h-[calc(100vh-10.25rem)] space-y-4 overflow-y-auto p-4">
            <section>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Tasks</p>
                <span className="text-xs text-[var(--tf-text-muted)]">{selectedTasks.length}</span>
              </div>
              <div className="divide-y divide-[var(--tf-border)] rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)]">
                {selectedTasks.length ? (
                  selectedTasks.map((task) => (
                    <div key={task.id} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5">
                      <Link to={`/tasks/${task.id}`} className="min-w-0">
                        <p className="truncate text-sm text-[var(--tf-text)]">{task.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--tf-text-muted)]">
                          {task.assigned_member || task.assigned_team || "Unassigned"} · {task.priority}
                        </p>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void removeTask(task.id)}
                        className="text-xs text-rose-600 hover:text-rose-500 dark:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-3 text-sm text-[var(--tf-text-muted)]">No linked tasks.</div>
                )}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-medium uppercase text-[var(--tf-text-muted)]">Callback</p>
              <div className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-3">
                {selectedEvents[0] ? (
                  <>
                    <p className="text-sm font-medium text-[var(--tf-text)]">{selectedEvents[0].title}</p>
                    <p className="mt-1 text-xs text-[var(--tf-text-muted)]">{formatDate(selectedEvents[0].start_at)}</p>
                    <Link to="/calendar" className="mt-3 inline-flex text-xs text-blue-600 hover:text-blue-500 dark:text-blue-300">
                      View calendar
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-[var(--tf-text-muted)]">No callback scheduled.</p>
                )}
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-medium uppercase text-[var(--tf-text-muted)]">Latest trace</p>
              <div className="divide-y divide-[var(--tf-border)] rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)]">
                {selectedRuns[0] ? (
                  <>
                    <MetricRow label="Engine" value={selectedRuns[0].engine_mode || "Unknown"} />
                    <MetricRow label="Status" value={selectedRuns[0].status} />
                    <MetricRow label="Steps" value={`${selectedRuns[0].steps_json?.length || 0}`} />
                    <MetricRow label="Run" value={formatDate(selectedRuns[0].created_at)} />
                  </>
                ) : (
                  <div className="px-3 py-3 text-sm text-[var(--tf-text-muted)]">No run trace linked.</div>
                )}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
