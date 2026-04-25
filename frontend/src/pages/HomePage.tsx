import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { fetchState } from "../api";
import type { Customer, Event, Note, StateResponse, SupportCase, Task, WorkflowStep } from "../types";

type CaseRecord = {
  id: string;
  priority: "P0" | "P1" | "P2";
  rawId: string;
  caseTitle: string;
  customer: string;
  owner: string;
  status: "Open" | "In progress" | "Waiting" | "Done";
  lastActivity: string;
  summary: string;
  entities: Array<{ label: string; value: string }>;
  tasks: Array<{ id: string; title: string; owner: string; status: string }>;
  nextAction: string;
  engineMode: string;
  traceId: string;
  auditStatus: string;
  pipelineSteps: Array<{ label: string; value: string }>;
  runSteps: WorkflowStep[];
};

type BadgeTone = "neutral" | "accent" | "open" | "progress" | "waiting" | "done" | "urgent";

function statusTone(value: string): BadgeTone {
  const normalized = value.toLowerCase();
  if (normalized === "open") return "open";
  if (normalized === "in progress") return "progress";
  if (normalized === "waiting") return "waiting";
  if (normalized === "done") return "done";
  return "neutral";
}

function priorityTone(value: string): BadgeTone {
  if (value === "P0") return "urgent";
  if (value === "P1") return "accent";
  return "neutral";
}

function titleCase(value?: string | null) {
  if (!value) return "Unassigned";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function formatCaseId(id: string) {
  return `TF-${id.slice(0, 4).toUpperCase()}`;
}

function formatActivity(value?: string | null) {
  if (!value) return "No activity";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "No activity";
  const seconds = Math.max(1, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function priorityFromSeverity(severity?: string | null): CaseRecord["priority"] {
  const normalized = severity?.toLowerCase();
  if (normalized === "high" || normalized === "critical") return "P0";
  if (normalized === "medium") return "P1";
  return "P2";
}

function statusFromCase(supportCase: SupportCase, tasks: Task[]): CaseRecord["status"] {
  const normalized = supportCase.status.toLowerCase();
  if (normalized === "closed" || normalized === "done" || normalized === "resolved") return "Done";
  if (tasks.some((task) => task.status.toLowerCase() === "in_progress")) return "In progress";
  if (tasks.some((task) => task.status.toLowerCase() === "waiting")) return "Waiting";
  return "Open";
}

function latestCaseTime(supportCase: SupportCase, tasks: Task[], notes: Note[], events: Event[], run?: StateResponse["workflow_runs"][number]) {
  const timestamps = [supportCase.updated_at, run?.completed_at, run?.created_at, ...tasks.map((task) => task.updated_at), ...notes.map((note) => note.updated_at), ...events.map((event) => event.updated_at)]
    .filter(Boolean)
    .sort();
  return timestamps[timestamps.length - 1];
}

function artifactString(run: StateResponse["workflow_runs"][number] | undefined, key: string) {
  const value = run?.artifacts_json?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function mapRecords(state: StateResponse): CaseRecord[] {
  const customersById = new Map(state.customers.map((customer) => [customer.id, customer]));
  const runsByCase = new Map<string, StateResponse["workflow_runs"][number]>();
  for (const run of state.workflow_runs) {
    if (run.case_id && !runsByCase.has(run.case_id)) {
      runsByCase.set(run.case_id, run);
    }
  }

  return state.cases.map((supportCase) => {
    const customer = supportCase.customer_id ? customersById.get(supportCase.customer_id) : undefined;
    const caseTasks = state.tasks.filter((task) => task.case_id === supportCase.id);
    const caseNotes = state.notes.filter((note) => note.case_id === supportCase.id);
    const caseEvents = state.events.filter((event) => event.case_id === supportCase.id);
    const run = runsByCase.get(supportCase.id);
    const summary = artifactString(run, "case_summary") || caseNotes[0]?.body || supportCase.source_text;
    const nextAction =
      artifactString(run, "suggested_next_action") ||
      (caseTasks.some((task) => task.status === "open")
        ? `Assign ${supportCase.assigned_team || "an owner"} to the next open task.`
        : "Review the case and confirm customer handoff.");

    const entities = [
      { label: "Contact", value: customer?.name || "Unknown" },
      { label: "Email", value: customer?.email || "Not captured" },
      { label: "Team", value: supportCase.assigned_team || "Support Operations" },
      { label: "Severity", value: titleCase(supportCase.severity) },
    ];
    if (caseEvents[0]) {
      entities.push({ label: "Callback", value: new Date(caseEvents[0].start_at).toLocaleString() });
    }

    const mcpCalls = run?.steps_json?.filter((step) => step.tool_name).length || caseTasks.length + caseNotes.length + caseEvents.length;

    return {
      id: formatCaseId(supportCase.id),
      rawId: supportCase.id,
      priority: priorityFromSeverity(supportCase.severity),
      caseTitle: supportCase.title,
      customer: customer?.name || customer?.email || "Unknown",
      owner: supportCase.assigned_team || "Support Operations",
      status: statusFromCase(supportCase, caseTasks),
      lastActivity: formatActivity(latestCaseTime(supportCase, caseTasks, caseNotes, caseEvents, run)),
      summary,
      entities,
      tasks: caseTasks.map((task) => ({
        id: task.id,
        title: task.title,
        owner: task.assigned_member || task.assigned_team || supportCase.assigned_team || "Unassigned",
        status: titleCase(task.status),
      })),
      nextAction,
      engineMode: run?.engine_mode || "not run",
      traceId: run ? `trc_${run.id.slice(0, 8)}` : "No trace",
      auditStatus: run ? "available" : "pending",
      pipelineSteps: [
        { label: "Intake", value: supportCase.customer_id ? "customer linked" : "case opened" },
        { label: "Triage", value: supportCase.assigned_team || "unassigned" },
        { label: "Execution", value: `${mcpCalls} MCP call${mcpCalls === 1 ? "" : "s"}` },
        { label: "Operator handoff", value: caseTasks.some((task) => task.status === "open") ? "action required" : "ready" },
      ],
      runSteps: run?.steps_json || [],
    };
  });
}

function StatusBadge({ children, tone = "neutral" }: { children: string; tone?: BadgeTone }) {
  const toneClass = {
    neutral: "border-[var(--tf-border)] bg-[var(--tf-surface-muted)] text-[var(--tf-text-soft)]",
    accent: "border-blue-400/30 bg-blue-400/10 text-blue-700 dark:text-blue-200",
    open: "border-sky-400/25 bg-sky-400/10 text-sky-700 dark:text-sky-200",
    progress: "border-blue-400/30 bg-blue-400/10 text-blue-700 dark:text-blue-200",
    waiting: "border-amber-400/25 bg-amber-400/10 text-amber-700 dark:text-amber-200",
    done: "border-emerald-400/25 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200",
    urgent: "border-rose-400/30 bg-rose-400/10 text-rose-700 dark:text-rose-200",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${toneClass}`}>
      {children}
    </span>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--tf-border)] py-2.5 last:border-b-0">
      <span className="text-xs text-[var(--tf-text-muted)]">{label}</span>
      <span className="text-xs font-medium text-[var(--tf-text)]">{value}</span>
    </div>
  );
}

function QueueTable({
  records,
  selectedId,
  onSelect,
}: {
  records: CaseRecord[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="min-w-0 border-r border-[var(--tf-border)]">
      <div className="border-b border-[var(--tf-border)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--tf-text)]">Work queue</h2>
            <p className="text-xs text-[var(--tf-text-muted)]">{records.length} active cases</p>
          </div>
          <StatusBadge tone="accent">SLA monitored</StatusBadge>
        </div>
      </div>
      <div className="overflow-x-auto">
        {records.length ? (
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs text-[var(--tf-text-muted)]">
              <tr>
                <th className="w-20 border-b border-[var(--tf-border)] px-4 py-2 font-medium">Priority</th>
                <th className="border-b border-[var(--tf-border)] px-3 py-2 font-medium">Case</th>
                <th className="w-28 border-b border-[var(--tf-border)] px-3 py-2 font-medium">Customer</th>
                <th className="w-24 border-b border-[var(--tf-border)] px-3 py-2 font-medium">Owner</th>
                <th className="w-28 border-b border-[var(--tf-border)] px-3 py-2 font-medium">Status</th>
                <th className="w-24 border-b border-[var(--tf-border)] px-3 py-2 font-medium">Activity</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const active = record.rawId === selectedId;
                return (
                  <tr
                    key={record.rawId}
                    onClick={() => onSelect(record.rawId)}
                    className={`cursor-pointer transition ${active ? "bg-[var(--tf-row-active)]" : "hover:bg-[var(--tf-surface-muted)]"}`}
                  >
                    <td className="border-b border-[var(--tf-border)] px-4 py-3">
                      <StatusBadge tone={priorityTone(record.priority)}>{record.priority}</StatusBadge>
                    </td>
                    <td className="border-b border-[var(--tf-border)] px-3 py-3">
                      <p className="line-clamp-1 font-medium text-[var(--tf-text)]">{record.caseTitle}</p>
                      <p className="mt-0.5 text-xs text-[var(--tf-text-muted)]">{record.id}</p>
                    </td>
                    <td className="border-b border-[var(--tf-border)] px-3 py-3 text-[var(--tf-text-soft)]">{record.customer}</td>
                    <td className="border-b border-[var(--tf-border)] px-3 py-3 text-[var(--tf-text-soft)]">{record.owner}</td>
                    <td className="border-b border-[var(--tf-border)] px-3 py-3">
                      <StatusBadge tone={statusTone(record.status)}>{record.status}</StatusBadge>
                    </td>
                    <td className="border-b border-[var(--tf-border)] px-3 py-3 text-[var(--tf-text-muted)]">{record.lastActivity}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-4 py-12 text-sm text-[var(--tf-text-muted)]">No cases yet. Run a workflow to populate the queue.</div>
        )}
      </div>
    </section>
  );
}

function CaseDetailPanel({ record }: { record: CaseRecord }) {
  return (
    <section className="min-w-0 border-r border-[var(--tf-border)]">
      <div className="border-b border-[var(--tf-border)] px-4 py-3">
        <p className="text-xs text-[var(--tf-text-muted)]">{record.id}</p>
        <h2 className="mt-1 text-sm font-semibold text-[var(--tf-text)]">{record.caseTitle}</h2>
      </div>

      <div className="space-y-5 p-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase text-[var(--tf-text-muted)]">Summary</p>
          <p className="text-sm leading-6 text-[var(--tf-text-soft)]">{record.summary}</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase text-[var(--tf-text-muted)]">Extracted entities</p>
          <div className="divide-y divide-[var(--tf-border)] rounded-md border border-[var(--tf-border)]">
            {record.entities.map((entity) => (
              <MetricRow key={entity.label} label={entity.label} value={entity.value} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase text-[var(--tf-text-muted)]">Assigned tasks</p>
          <div className="divide-y divide-[var(--tf-border)] rounded-md border border-[var(--tf-border)]">
            {record.tasks.length ? record.tasks.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="grid grid-cols-[1fr_auto] gap-3 px-3 py-2.5 transition hover:bg-[var(--tf-row-hover)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--tf-text)]">{task.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--tf-text-muted)]">{task.owner}</p>
                </div>
                <StatusBadge tone={statusTone(task.status)}>{task.status}</StatusBadge>
              </Link>
            )) : <div className="px-3 py-2.5 text-sm text-[var(--tf-text-muted)]">No linked tasks.</div>}
          </div>
        </div>

        <div className="rounded-md border border-blue-400/20 bg-blue-400/[0.06] p-3">
          <p className="text-xs font-medium uppercase text-blue-700 dark:text-blue-200">Next best action</p>
          <p className="mt-2 text-sm leading-6 text-[var(--tf-text)]">{record.nextAction}</p>
        </div>
      </div>
    </section>
  );
}

function AgentTracePanel({
  record,
  collapsed,
  onToggle,
}: {
  record: CaseRecord;
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <aside className="hidden min-w-0 border-l border-[var(--tf-border)] bg-[var(--tf-surface-muted)] xl:block">
        <button
          type="button"
          onClick={onToggle}
          className="flex h-full w-full flex-col items-center gap-3 px-2 py-4 text-xs text-[var(--tf-text-muted)] hover:bg-[var(--tf-surface-muted)] hover:text-[var(--tf-text-soft)]"
          aria-label="Expand agent run panel"
        >
          <span className="rounded-md border border-[var(--tf-border)] px-2 py-1 text-[var(--tf-text-soft)]">Run</span>
          <span className="[writing-mode:vertical-rl]">Trace available</span>
        </button>
      </aside>
    );
  }

  return (
    <aside className="min-w-0 bg-[var(--tf-surface-muted)]">
      <div className="border-b border-[var(--tf-border)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--tf-text)]">Agent run</h2>
            <p className="text-xs text-[var(--tf-text-muted)]">Execution state</p>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-md border border-[var(--tf-border)] px-2 py-1 text-xs text-slate-400 hover:bg-[var(--tf-row-hover)] hover:text-[var(--tf-text)]"
          >
            Collapse
          </button>
        </div>
      </div>

      <div className="space-y-5 p-4">
        <div className="divide-y divide-[var(--tf-border)] rounded-md border border-[var(--tf-border)]">
          <MetricRow label="Trace ID" value={record.traceId} />
          <MetricRow label="Engine mode" value={record.engineMode.replace("_", " ")} />
          <MetricRow label="Last run" value={record.lastActivity} />
          <MetricRow label="Audit log" value={record.auditStatus} />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase text-[var(--tf-text-muted)]">Pipeline</p>
          <div className="divide-y divide-[var(--tf-border)] rounded-md border border-[var(--tf-border)]">
            {record.pipelineSteps.map((step, index) => (
              <div key={step.label} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md border border-[var(--tf-border)] text-[11px] text-[var(--tf-text-muted)]">
                    {index + 1}
                  </span>
                  <span className="text-sm text-[var(--tf-text-soft)]">{step.label}</span>
                </div>
                <span className="text-xs text-[var(--tf-text-muted)]">{step.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase text-[var(--tf-text-muted)]">Run metadata</p>
          <div className="space-y-2">
            <StatusBadge>{record.auditStatus === "available" ? "Audit log available" : "Audit log pending"}</StatusBadge>
            <StatusBadge>{record.runSteps.length ? `${record.runSteps.length} trace step${record.runSteps.length === 1 ? "" : "s"}` : "No trace steps"}</StatusBadge>
            <StatusBadge>{record.tasks.length ? "Owner handoff required" : "No open handoff"}</StatusBadge>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function HomePage() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [traceCollapsed, setTraceCollapsed] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const records = useMemo(() => (state ? mapRecords(state) : []), [state]);
  const selectedCase = useMemo(() => {
    if (!records.length) return null;
    return records.find((record) => record.rawId === selectedId) || records[0];
  }, [records, selectedId]);

  useEffect(() => {
    let cancelled = false;
    fetchState()
      .then((nextState) => {
        if (cancelled) return;
        setState(nextState);
        setError(null);
        setSelectedId((current) => current || nextState.cases[0]?.id || null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={`grid min-h-[calc(100vh-3.5rem)] bg-[var(--tf-bg)] ${
        traceCollapsed
          ? "xl:grid-cols-[minmax(620px,1.5fr)_430px_48px]"
          : "xl:grid-cols-[minmax(560px,1.25fr)_410px_300px]"
      }`}
    >
      <QueueTable records={records} selectedId={selectedCase?.rawId || ""} onSelect={setSelectedId} />
      {selectedCase ? (
        <>
          <CaseDetailPanel record={selectedCase} />
          <AgentTracePanel
            record={selectedCase}
            collapsed={traceCollapsed}
            onToggle={() => setTraceCollapsed((current) => !current)}
          />
        </>
      ) : (
        <section className="border-r border-[var(--tf-border)] p-4 text-sm text-[var(--tf-text-muted)]">
          {error || (state ? "Run a workflow to create the first support case." : "Loading support queue...")}
        </section>
      )}
    </div>
  );
}
