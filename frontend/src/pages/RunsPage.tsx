import { useEffect, useState } from "react";
import { deleteWorkflowRun, fetchState } from "../api";
import { StateResponse } from "../types";

export function RunsPage() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4 p-5">
      <section className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-6  ">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Run Logs</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--tf-text)] ">Execution history in a separate page</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">
              Keep workflow history separate from live work. Use this page to review which engine handled each run and
              remove old records when needed.
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
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>

      <section className="space-y-4">
        {(state?.workflow_runs || []).length === 0 ? (
          <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-6 text-sm text-[var(--tf-text-muted)]   dark:text-[var(--tf-text-muted)]">
            No run logs saved.
          </div>
        ) : (
          (state?.workflow_runs || []).map((run) => (
            <article key={run.id} className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-6  ">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs text-[var(--tf-text-soft)] /10 dark:text-[var(--tf-text-soft)]">{run.status}</span>
                    <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                      {run.engine_mode || "Unknown engine"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-[var(--tf-text)] ">{run.summary || "Run log entry"}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{run.request_text}</p>
                  <p className="mt-3 text-xs text-[var(--tf-text-muted)]">
                    {new Date(run.created_at).toLocaleString()} · {run.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteWorkflowRun(run.id).then(refresh)}
                  className="rounded-md border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-400/10"
                >
                  Delete log
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
