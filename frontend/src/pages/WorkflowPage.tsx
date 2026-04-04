import { FormEvent, useState } from "react";
import { runWorkflow } from "../api";
import { WorkflowResponse } from "../types";

const examplePrompts = [
  "Support issue: The customer cannot access onboarding emails. Create a follow-up task, schedule a reminder tomorrow at 9 AM, and save a note with the issue summary.",
  "Save these meeting notes and create follow-up tasks: Action item: send pricing recap. Action item: confirm implementation timeline.",
  "Create a task to prepare Friday's demo, block one hour tomorrow at 10 AM, and save note: bring pricing slides.",
];

export function WorkflowPage() {
  const [prompt, setPrompt] = useState(examplePrompts[0]);
  const [result, setResult] = useState<WorkflowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const next = await runWorkflow(prompt);
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Run Workflow</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Tell the agent what happened and what needs to happen next.</h2>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
            Gemini visible in result
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={10}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-6 text-slate-100 outline-none ring-0 placeholder:text-slate-500"
          />
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Use example
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60"
          >
            {loading ? "Running..." : "Run workflow"}
          </button>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Latest Result</p>
        {!result ? (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">
            Run a workflow to see the result, created artifacts, and whether Gemini ADK or the fallback path handled it.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-white">Summary</h3>
                <div className="flex gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">{result.status}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      result.engine_mode === "gemini_adk"
                        ? "bg-emerald-400/20 text-emerald-300"
                        : "bg-amber-400/20 text-amber-200"
                    }`}
                  >
                    {result.engine_mode === "gemini_adk" ? "Gemini ADK" : "Fallback"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{result.summary}</p>
              <p className="mt-3 text-xs text-slate-500">Run ID: {result.workflow_run_id}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5">
              <h3 className="text-lg font-semibold text-white">Workflow steps</h3>
              <ol className="mt-4 space-y-3">
                {result.steps.length === 0 ? (
                  <li className="text-sm text-slate-400">No steps returned.</li>
                ) : (
                  result.steps.map((step, index) => (
                    <li key={`${step.agent}-${index}`} className="rounded-xl border border-white/10 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <strong className="text-sm text-white">{step.agent}</strong>
                        <span className="text-xs uppercase tracking-wide text-slate-400">{step.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{step.action}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{step.detail}</p>
                    </li>
                  ))
                )}
              </ol>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
