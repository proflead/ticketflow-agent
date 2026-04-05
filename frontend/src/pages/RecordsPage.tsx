import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteCase, deleteTask, fetchState } from "../api";
import { StateResponse, SupportCase, Task } from "../types";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="text-sm text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}

function RecordCard({
  title,
  meta,
  children,
  onDelete,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  onDelete?: () => Promise<void>;
}) {
  return (
    <details className="rounded-2xl border border-black/10 bg-white/90 p-4 open:border-slate-400/40 dark:border-white/10 dark:bg-slate-900/60 dark:open:border-slate-500/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-950 dark:text-white">{title}</h4>
          {meta ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{meta}</p> : null}
        </div>
        {onDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              void onDelete();
            }}
            className="rounded-full border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-400/10"
          >
            Delete
          </button>
        ) : null}
      </summary>
      <div className="mt-4 space-y-3">{children}</div>
    </details>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString();
}

export function RecordsPage() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

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

  const filteredTasks = useMemo(() => {
    const tasks = state?.tasks || [];
    return selectedCaseId ? tasks.filter((task) => task.case_id === selectedCaseId) : tasks;
  }, [selectedCaseId, state?.tasks]);

  const sortedTasks = useMemo(
    () =>
      [...filteredTasks].sort((a, b) => {
        const aTime = a.due_at ? new Date(a.due_at).getTime() : new Date(a.created_at || 0).getTime();
        const bTime = b.due_at ? new Date(b.due_at).getTime() : new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      }),
    [filteredTasks]
  );

  const activeCase = useMemo(
    () => (state?.cases || []).find((item) => item.id === selectedCaseId) || null,
    [selectedCaseId, state?.cases]
  );

  const sortedCases = useMemo(
    () =>
      [...(state?.cases || [])].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      ),
    [state?.cases]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Support Cases</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Cases and linked tasks</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              This page is for the operator who needs to inspect support cases, review their linked tasks, and clean up
              case records during a demo or daily workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full border border-black/10 px-4 py-2 text-sm text-slate-900 hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>

      <section className="overflow-hidden rounded-3xl border border-black/10 bg-white/90 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Support Cases</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Select a case to focus the task view below</h3>
            </div>
            <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
              {state?.cases.length || 0} cases
            </span>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedCaseId(null)}
              className={`rounded-2xl border p-5 text-left transition ${
                selectedCaseId === null
                  ? "border-slate-400/50 bg-slate-100 dark:border-slate-500/40 dark:bg-slate-800"
                  : "border-black/10 bg-white/70 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/40 dark:hover:bg-white/5"
              }`}
            >
              <p className="text-sm font-semibold text-slate-950 dark:text-white">All Cases</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Show tasks across every support case.</p>
            </button>
            {(state?.cases || []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No support cases saved yet.</p>
            ) : (
              sortedCases.map((supportCase: SupportCase) => (
                <div
                  key={supportCase.id}
                  className={`rounded-2xl border p-5 transition ${
                    selectedCaseId === supportCase.id
                      ? "border-slate-400/50 bg-slate-100 dark:border-slate-500/40 dark:bg-slate-800"
                      : "border-black/10 bg-white/70 dark:border-white/10 dark:bg-slate-950/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <button type="button" onClick={() => setSelectedCaseId(supportCase.id)} className="flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {supportCase.assigned_team || "Unassigned"}
                        </span>
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {supportCase.issue_category || "General Support"}
                        </span>
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {supportCase.severity || "medium"}
                        </span>
                      </div>
                      <h4 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">{supportCase.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{supportCase.source_text}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Created: {formatDate(supportCase.created_at)}</span>
                        <Link
                          to={`/cases/${supportCase.id}`}
                          className="rounded-full border border-black/10 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
                        >
                          Open case details
                        </Link>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteCase(supportCase.id);
                        if (selectedCaseId === supportCase.id) {
                          setSelectedCaseId(null);
                        }
                        await refresh();
                      }}
                      className="rounded-full border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-400/10 dark:text-rose-300"
                    >
                      Delete case
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border-t border-black/10 bg-slate-50/80 px-6 py-6 dark:border-white/10 dark:bg-slate-950/50">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Active View</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
                {activeCase ? `Tasks linked to case: ${activeCase.title}` : "Showing tasks from all cases"}
              </h3>
            </div>
            {activeCase ? (
              <button
                type="button"
                onClick={() => setSelectedCaseId(null)}
                className="rounded-full border border-black/10 px-4 py-2 text-sm text-slate-900 hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
              >
                Clear case filter
              </button>
            ) : null}
          </div>
          {activeCase ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {activeCase.assigned_team || "Unassigned"}
              </span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {activeCase.issue_category || "General Support"}
              </span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {activeCase.severity || "medium"}
              </span>
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {sortedTasks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No tasks linked to this view yet.</p>
            ) : (
              sortedTasks.map((task) => (
                <RecordCard
                  key={task.id}
                  title={task.title}
                  meta={`${task.priority} priority${task.due_at ? ` · due ${formatDate(task.due_at)}` : ""}`}
                  onDelete={async () => {
                    await deleteTask(task.id);
                    await refresh();
                  }}
                >
                  <DetailRow label="Status" value={task.status} />
                  <DetailRow label="Assigned team" value={task.assigned_team || "Not assigned"} />
                  <DetailRow label="Assigned member" value={task.assigned_member || "Not assigned"} />
                  <DetailRow label="Issue category" value={task.issue_category || "Not classified"} />
                  <DetailRow label="Task notes" value={task.description || "No task notes"} />
                  <DetailRow label="Created" value={formatDate(task.created_at)} />
                  <DetailRow label="ID" value={task.id} />
                </RecordCard>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
