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
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Workflow Runs</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Execution history in a separate page</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Keep workflow history separate from live work. Use this page to review which engine handled each run and
              remove old demo runs when needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </section>

      <section className="space-y-4">
        {(state?.workflow_runs || []).length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 text-sm text-slate-400">
            No workflow runs saved.
          </div>
        ) : (
          (state?.workflow_runs || []).map((run) => (
            <article key={run.id} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{run.status}</span>
                    <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-300">
                      {run.engine_mode || "Unknown engine"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-white">{run.summary || "Workflow run"}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{run.request_text}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    {new Date(run.created_at).toLocaleString()} · {run.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteWorkflowRun(run.id).then(refresh)}
                  className="rounded-full border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-400/10"
                >
                  Delete run
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
