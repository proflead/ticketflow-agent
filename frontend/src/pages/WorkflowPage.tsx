import { FormEvent, useState } from "react";
import { runWorkflow } from "../api";
import { WorkflowResponse } from "../types";

const examplePrompts = [
  `Live chat transcript:
Customer: Hi, we onboarded three new teammates today and none of them can reset their password.
Customer: My name is Sarah Lee. You can reach me at sarah.lee@northstar.io or +1 415 555 0101.
Agent: Thanks, I am checking. Did they get the welcome email?
Customer: Yes, but the reset link says permission denied.
Agent: Understood. I will escalate this.`,
  `Live chat transcript:
Customer: Since we changed our billing owner, invoices stopped arriving by email.
Customer: This is Michael Torres from BrightOps, email michael@brightops.com.
Agent: Are renewal reminders still coming through?
Customer: No, all billing emails stopped after the ownership change.
Agent: Thanks, I will open a case and ask billing to review it.`,
  `Live chat transcript:
Customer: We need the onboarding checklist before tomorrow's implementation call.
Agent: I can help with that. Anything else to prepare?
Customer: Please send pricing recap, confirm the implementation timeline, and remind me tomorrow at 10 AM.
Agent: Noted.`,
];

function LoadingResult() {
  return (
    <div className="mt-6 rounded-2xl border border-black/10 bg-slate-50 p-6 dark:border-white/10 dark:bg-slate-950/60">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-slate-950 dark:border-slate-700 dark:border-t-white" />
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Running workflow</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            The agent is classifying the issue, creating records, and saving the latest result.
          </p>
        </div>
      </div>
    </div>
  );
}

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
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Run Workflow</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Paste the live chat conversation and let the agent turn it into a case.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              TicketFlow stores the full conversation inside the case, writes a summary, classifies the issue,
              assigns the owning team, and creates the follow-up work under that case.
            </p>
          </div>
          <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
            Gemini visible in result
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={10}
            className="w-full rounded-2xl border border-black/10 bg-white p-4 text-sm leading-6 text-slate-950 outline-none ring-0 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, index) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rounded-full border border-black/10 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              >
                {index === 0 ? "Password reset chat" : index === 1 ? "Billing email chat" : "Onboarding prep chat"}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            {loading ? "Running..." : "Run workflow"}
          </button>
          {error ? <p className="text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
        </form>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Latest Result</p>
        {loading ? (
          <LoadingResult />
        ) : !result ? (
          <div className="mt-6 rounded-2xl border border-dashed border-black/10 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
            Run a workflow to see the result, created artifacts, and whether Gemini ADK or the fallback path handled it.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-2xl border border-black/10 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/60">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Summary</h3>
                <div className="flex gap-2">
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-slate-200">{result.status}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      result.engine_mode === "gemini_adk"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-200"
                    }`}
                  >
                    {result.engine_mode === "gemini_adk" ? "Gemini ADK" : "Fallback"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{result.summary}</p>
              <p className="mt-3 text-xs text-slate-500">Run ID: {result.workflow_run_id}</p>
            </div>

            {result.case ? (
              <div className="rounded-2xl border border-black/10 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/60">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Support case created</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Case title</p>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{result.case.title}</p>
                  </div>
                  <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Case ID</p>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{result.case.id}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {result.customer ? (
              <div className="rounded-2xl border border-black/10 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/60">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Customer identified</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Name</p>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{result.customer.name || "Not captured"}</p>
                  </div>
                  <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{result.customer.email || "Not captured"}</p>
                  </div>
                  <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Phone</p>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{result.customer.phone || "Not captured"}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {result.case_summary ? (
              <div className="rounded-2xl border border-black/10 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/60">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Conversation summary</h3>
                <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{result.case_summary}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-black/10 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/60">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Bug classification and team assignment</h3>
              {Object.keys(result.triage).length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No issue triage was detected for this request.</p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Issue category</p>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{result.triage.issue_category}</p>
                  </div>
                  <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Assigned team</p>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{result.triage.assigned_team}</p>
                  </div>
                  <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Severity</p>
                    <p className="mt-2 text-sm font-medium text-slate-950 dark:text-white">{result.triage.severity}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-black/10 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/60">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Tasks</h3>
                <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{result.tasks.length}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/60">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Events</h3>
                <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{result.events.length}</p>
              </div>
              <div className="rounded-2xl border border-black/10 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/60">
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Notes</h3>
                <p className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">{result.notes.length}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-slate-50 p-5 dark:border-white/10 dark:bg-slate-950/60">
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Workflow steps</h3>
              <ol className="mt-4 space-y-3">
                {result.steps.length === 0 ? (
                  <li className="text-sm text-slate-500 dark:text-slate-400">No steps returned.</li>
                ) : (
                  result.steps.map((step, index) => (
                    <li key={`${step.agent}-${index}`} className="rounded-xl border border-black/10 p-4 dark:border-white/10">
                      <div className="flex items-center justify-between gap-4">
                        <strong className="text-sm text-slate-950 dark:text-white">{step.agent}</strong>
                        <span className="text-xs uppercase tracking-wide text-slate-400">{step.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{step.action}</p>
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
