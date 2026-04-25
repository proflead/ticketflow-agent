import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { clearWorkspaceData, runWorkflow } from "../api";
import { WorkflowResponse } from "../types";

const examplePrompts = [
  `Live chat transcript:
Customer: This is Priya Shah at AtlasCloud. Email priya.shah@atlascloud.com, phone +1 212 555 0184.
Customer: Our enterprise renewal is next week and the production webhook sync has been down since this morning.
Customer: We are blocked from provisioning two new regions, finance is asking whether to pause renewal, and our VP wants a status call.
Agent: I understand this is urgent. I will escalate.
Customer: Please create follow-up for engineering to inspect webhook failures, send an executive status update, confirm the renewal-risk owner, and schedule a 30 minute call tomorrow at 10 AM.
Agent: I will open a high priority case and keep the transcript attached.`,
  `Live chat transcript:
Customer: Hi, we onboarded three new teammates today and none of them can reset their password.
Customer: My name is Sarah Lee. You can reach me at sarah.lee@northstar.io or +1 415 555 0101.
Agent: Thanks, I am checking. Did they get the welcome email?
Customer: Yes, but the reset link says permission denied. Please follow up with identity and send the admin a status update.
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

const promptLabels = ["Enterprise incident", "Password reset", "Billing notifications", "Onboarding prep"];

function LoadingResult() {
  return (
    <div className="mt-4 rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)]">
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--tf-border)] border-t-slate-950 dark:border-slate-700 dark:border-t-white" />
        <div>
          <p className="text-sm font-semibold text-[var(--tf-text)] ">Executing intake workflow</p>
          <p className="mt-1 text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">
            Classifying, creating case artifacts, and writing the trace log.
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
  const [resetMessage, setResetMessage] = useState<string | null>(null);
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

  async function handleReset() {
    setResetMessage(null);
    try {
      const reset = await clearWorkspaceData();
      setResult(null);
      setResetMessage(`Workspace cleared: ${reset.support_cases || 0} cases, ${reset.tasks || 0} tasks, ${reset.workflow_runs || 0} runs removed.`);
    } catch (err) {
      setResetMessage(err instanceof Error ? err.message : "Workspace reset failed");
    }
  }

  return (
    <div className="space-y-4 p-5">
      <section className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)]  ">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--tf-border)] px-5 py-4 ">
          <div>
            <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Workflow Intake</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--tf-text)] ">Convert a live conversation into operational artifacts.</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">
              TicketFlow stores the full conversation, identifies the customer, classifies severity, assigns ownership,
              creates follow-up tasks and notes, schedules explicit requests, and records every MCP tool call.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className="rounded-full border border-[var(--tf-border)] px-3 py-1 text-xs text-[var(--tf-text-muted)]  dark:text-[var(--tf-text-soft)]">
              Gemini ADK or fallback
            </span>
            <button
              type="button"
              onClick={() => void handleReset()}
              className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-200 dark:hover:bg-rose-400/10"
            >
              Clear workspace
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-0 xl:grid-cols-[1fr_320px]">
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Source transcript</p>
              <span className="text-xs text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">{prompt.length.toLocaleString()} chars</span>
            </div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={14}
              className="min-h-[22rem] w-full resize-y rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-4 font-mono text-sm leading-6 text-[var(--tf-text)] outline-none ring-0 placeholder:text-[var(--tf-text-muted)] focus:border-slate-500  dark:bg-[var(--tf-bg)] dark:text-slate-100 dark:placeholder:text-[var(--tf-text-muted)]"
            />
          </div>
          <div className="border-t border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)] xl:border-l xl:border-t-0">
            <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Scenario library</p>
            <div className="mt-3 space-y-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="w-full rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] px-3 py-2 text-left text-sm font-medium text-[var(--tf-text-soft)] hover:border-slate-400 hover:bg-[var(--tf-surface-muted)]   dark:text-[var(--tf-text-soft)] dark:hover:bg-[var(--tf-surface)]/10"
                >
                  {promptLabels[index]}
                </button>
              ))}
            </div>
            <div className="mt-5 rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-4  ">
              <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Expected artifacts</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
                <span className="rounded-md bg-[var(--tf-surface-muted)] px-2 py-2 text-[var(--tf-text-soft)] /10 dark:text-[var(--tf-text-soft)]">Case</span>
                <span className="rounded-md bg-[var(--tf-surface-muted)] px-2 py-2 text-[var(--tf-text-soft)] /10 dark:text-[var(--tf-text-soft)]">Customer</span>
                <span className="rounded-md bg-[var(--tf-surface-muted)] px-2 py-2 text-[var(--tf-text-soft)] /10 dark:text-[var(--tf-text-soft)]">Tasks</span>
                <span className="rounded-md bg-[var(--tf-surface-muted)] px-2 py-2 text-[var(--tf-text-soft)] /10 dark:text-[var(--tf-text-soft)]">Run trace</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--tf-surface-muted)] disabled:opacity-60  dark:text-[var(--tf-text)] dark:hover:bg-[var(--tf-surface-muted)]"
            >
              {loading ? "Running..." : "Run workflow"}
            </button>
            {error ? <p className="mt-3 text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
            {resetMessage ? <p className="mt-3 text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">{resetMessage}</p> : null}
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-5  ">
        <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Latest Result</p>
        {loading ? (
          <LoadingResult />
        ) : !result ? (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--tf-border)] p-5 text-sm text-[var(--tf-text-muted)]  dark:text-[var(--tf-text-muted)]">
            Run a workflow to see the result, created artifacts, and whether Gemini ADK or the fallback path handled it.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)]">
                <p className="text-xs font-semibold uppercase text-[var(--tf-text-muted)]">Transcript in</p>
                <p className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap text-sm leading-7 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{prompt}</p>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)]">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-[var(--tf-text)] ">Structured output</h3>
                <div className="flex gap-2">
                  <span className="rounded-full bg-[var(--tf-surface-muted)] px-3 py-1 text-xs text-[var(--tf-text-soft)] /10 dark:text-[var(--tf-text-soft)]">{result.status}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      result.engine_mode === "gemini_adk"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-200"
                    }`}
                  >
                    {result.engine_mode === "gemini_adk" ? "Gemini ADK" : "Heuristic Fallback"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{result.summary}</p>
              {result.automation_summary ? (
                <p className="mt-3 text-sm leading-6 text-emerald-700 dark:text-emerald-200">{result.automation_summary}</p>
              ) : null}
              {result.suggested_next_action ? (
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-50 p-4 dark:bg-emerald-500/10">
                  <p className="text-xs uppercase text-emerald-700 dark:text-emerald-200">Next best action</p>
                  <p className="mt-2 text-sm font-medium text-emerald-900 dark:text-emerald-100">{result.suggested_next_action}</p>
                </div>
              ) : null}
              <p className="mt-3 text-xs text-[var(--tf-text-muted)]">Run ID: {result.workflow_run_id}</p>
              {result.case ? (
                <Link
                  to={`/cases/${result.case.id}`}
                  className="mt-4 inline-flex rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--tf-surface-muted)]  dark:text-[var(--tf-text)] dark:hover:bg-[var(--tf-surface-muted)]"
                >
                  Open case details
                </Link>
              ) : null}
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-4  dark:bg-[var(--tf-surface-muted)]">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Tasks</p>
                    <p className="mt-2 text-3xl font-semibold text-[var(--tf-text)] ">{result.tasks.length}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-4  dark:bg-[var(--tf-surface-muted)]">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Events</p>
                    <p className="mt-2 text-3xl font-semibold text-[var(--tf-text)] ">{result.events.length}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-4  dark:bg-[var(--tf-surface-muted)]">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Notes</p>
                    <p className="mt-2 text-3xl font-semibold text-[var(--tf-text)] ">{result.notes.length}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-4  dark:bg-[var(--tf-surface-muted)]">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">MCP calls</p>
                    <p className="mt-2 text-3xl font-semibold text-[var(--tf-text)] ">{result.steps.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {result.case ? (
              <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)]">
                <h3 className="text-lg font-semibold text-[var(--tf-text)] ">Support case created</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Case title</p>
                    <p className="mt-2 text-sm font-medium text-[var(--tf-text)] ">{result.case.title}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Case ID</p>
                    <p className="mt-2 text-sm font-medium text-[var(--tf-text)] ">{result.case.id}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {result.customer ? (
              <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)]">
                <h3 className="text-lg font-semibold text-[var(--tf-text)] ">Customer identified</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Name</p>
                    <p className="mt-2 text-sm font-medium text-[var(--tf-text)] ">{result.customer.name || "Not captured"}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Email</p>
                    <p className="mt-2 text-sm font-medium text-[var(--tf-text)] ">{result.customer.email || "Not captured"}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Phone</p>
                    <p className="mt-2 text-sm font-medium text-[var(--tf-text)] ">{result.customer.phone || "Not captured"}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {result.case_summary ? (
              <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)]">
                <h3 className="text-lg font-semibold text-[var(--tf-text)] ">Conversation summary</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{result.case_summary}</p>
              </div>
            ) : null}

            <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)]">
              <h3 className="text-lg font-semibold text-[var(--tf-text)] ">Bug classification and team assignment</h3>
              {Object.keys(result.triage).length === 0 ? (
                <p className="mt-3 text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">No issue triage was detected for this request.</p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Issue category</p>
                    <p className="mt-2 text-sm font-medium text-[var(--tf-text)] ">{result.triage.issue_category}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Assigned team</p>
                    <p className="mt-2 text-sm font-medium text-[var(--tf-text)] ">{result.triage.assigned_team}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Severity</p>
                    <p className="mt-2 text-sm font-medium text-[var(--tf-text)] ">{result.triage.severity}</p>
                  </div>
                </div>
              )}
              {result.confidence_notes ? (
                <p className="mt-4 text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{result.confidence_notes}</p>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <ArtifactList title="Tasks" empty="No tasks created." items={result.tasks.map((task) => `${task.title} · ${task.priority} · ${task.assigned_team || "Unassigned"}`)} />
              <ArtifactList title="Events" empty="No events scheduled." items={result.events.map((event) => `${event.title} · ${new Date(event.start_at).toLocaleString()}`)} />
              <ArtifactList title="Notes" empty="No notes saved." items={result.notes.map((note) => `${note.title} · ${note.body.slice(0, 90)}`)} />
            </div>

            <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)]">
              <h3 className="text-lg font-semibold text-[var(--tf-text)] ">Workflow steps</h3>
              <ol className="mt-4 space-y-3">
                {result.steps.length === 0 ? (
                  <li className="text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">No steps returned.</li>
                ) : (
                  result.steps.map((step, index) => (
                    <li key={`${step.agent}-${index}`} className="rounded-xl border border-[var(--tf-border)] p-4 ">
                      <div className="flex items-center justify-between gap-4">
                        <strong className="text-sm text-[var(--tf-text)] ">{step.agent}</strong>
                        <span className="text-xs uppercase tracking-wide text-[var(--tf-text-muted)]">{step.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{step.action}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--tf-text-muted)]">{step.detail}</p>
                      {step.tool_name ? (
                        <p className="mt-2 text-xs font-semibold text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">MCP tool: {step.tool_name}</p>
                      ) : null}
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

function ArtifactList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-5  dark:bg-[var(--tf-surface-muted)]">
      <h3 className="text-lg font-semibold text-[var(--tf-text)] ">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">{empty}</p>
        ) : (
          items.map((item) => (
            <p key={item} className="rounded-xl border border-[var(--tf-border)] bg-[var(--tf-surface)] p-3 text-sm text-[var(--tf-text-soft)]   dark:text-[var(--tf-text-soft)]">
              {item}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
