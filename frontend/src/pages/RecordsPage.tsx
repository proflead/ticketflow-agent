import { ReactNode, useEffect, useMemo, useState } from "react";
import { deleteCase, deleteEvent, deleteNote, deleteTask, fetchState } from "../api";
import { Event, Note, StateResponse, SupportCase, Task } from "../types";

type ScheduleItem =
  | {
      kind: "event";
      id: string;
      title: string;
      description: string;
      whenLabel: string;
      sortAt: number;
      meta: string;
    }
  | {
      kind: "task";
      id: string;
      title: string;
      description: string;
      whenLabel: string;
      sortAt: number;
      meta: string;
    };

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="text-sm text-slate-200">{value}</span>
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

function buildSchedule(tasks: Task[], events: Event[]): { scheduled: ScheduleItem[]; unscheduledTasks: Task[] } {
  const scheduledEvents: ScheduleItem[] = events.map((event) => ({
    kind: "event",
    id: event.id,
    title: event.title,
    description: event.description || "No description",
    whenLabel: `${formatDate(event.start_at)} to ${formatDate(event.end_at)}`,
    sortAt: new Date(event.start_at).getTime(),
    meta: event.status,
  }));

  const scheduledTasks: ScheduleItem[] = tasks
    .filter((task) => task.due_at)
    .map((task) => ({
      kind: "task",
      id: task.id,
      title: task.title,
      description: task.description || "No description",
      whenLabel: formatDate(task.due_at),
      sortAt: new Date(task.due_at as string).getTime(),
      meta: `${task.priority} priority`,
    }));

  const unscheduledTasks = tasks.filter((task) => !task.due_at);

  const scheduled = [...scheduledEvents, ...scheduledTasks].sort((a, b) => a.sortAt - b.sortAt);
  return { scheduled, unscheduledTasks };
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

  const filteredEvents = useMemo(() => {
    const events = state?.events || [];
    return selectedCaseId ? events.filter((event) => event.case_id === selectedCaseId) : events;
  }, [selectedCaseId, state?.events]);

  const filteredNotes = useMemo(() => {
    const notes = state?.notes || [];
    return selectedCaseId ? notes.filter((note) => note.case_id === selectedCaseId) : notes;
  }, [selectedCaseId, state?.notes]);

  const schedule = useMemo(() => buildSchedule(filteredTasks, filteredEvents), [filteredTasks, filteredEvents]);

  const activeCase = useMemo(
    () => (state?.cases || []).find((item) => item.id === selectedCaseId) || null,
    [selectedCaseId, state?.cases]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Records</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Upcoming work and saved context</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              This page is for the operator who needs to see what is coming up next, inspect details, and clean up tasks,
              events, and notes during a demo or daily workflow.
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

      <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Support Cases</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Issue containers linking tasks, notes, and events</h3>
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
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Show all tasks, events, and notes across every support case.</p>
          </button>
          {(state?.cases || []).length === 0 ? (
            <p className="text-sm text-slate-400">No support cases saved yet.</p>
          ) : (
            (state?.cases || []).map((supportCase: SupportCase) => (
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
                    <p className="mt-3 text-xs text-slate-500">Case ID: {supportCase.id}</p>
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
                    className="rounded-full border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-400/10"
                  >
                    Delete case
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Active View</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
              {activeCase ? `Filtered by case: ${activeCase.title}` : "Showing records from all cases"}
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
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Upcoming Schedule</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Events and due tasks in one timeline</h3>
          </div>
          <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
            {schedule.scheduled.length} scheduled items
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {schedule.scheduled.length === 0 ? (
            <p className="text-sm text-slate-400">No scheduled tasks or events.</p>
          ) : (
            schedule.scheduled.map((item) => (
              <div
                key={`${item.kind}-${item.id}`}
                className="grid gap-4 rounded-2xl border border-black/10 bg-white/70 p-5 lg:grid-cols-[180px_1fr_auto] dark:border-white/10 dark:bg-slate-950/50"
              >
                <div className="space-y-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      item.kind === "event" ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200" : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {item.kind === "event" ? "Event" : "Task"}
                  </span>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.whenLabel}</p>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-slate-950 dark:text-white">{item.title}</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{item.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">{item.meta}</p>
                  {item.kind === "task" ? (
                    (() => {
                      const task = (state?.tasks || []).find((entry) => entry.id === item.id);
                      return task?.assigned_team || task?.issue_category ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {task.assigned_team ? (
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {task.assigned_team}
                            </span>
                          ) : null}
                          {task.issue_category ? (
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {task.issue_category}
                            </span>
                          ) : null}
                        </div>
                      ) : null;
                    })()
                  ) : null}
                </div>

                <div className="flex items-start justify-end">
                  {item.kind === "event" ? (
                    <button
                      type="button"
                      onClick={() => void deleteEvent(item.id).then(refresh)}
                      className="rounded-full border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-400/10"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void deleteTask(item.id).then(refresh)}
                      className="rounded-full border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-400/10"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Backlog Tasks</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Tasks without a due time</h3>
            </div>
            <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
              {schedule.unscheduledTasks.length} unscheduled tasks
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {schedule.unscheduledTasks.length === 0 ? (
              <p className="text-sm text-slate-400">No unscheduled tasks.</p>
            ) : (
              schedule.unscheduledTasks.map((task) => (
                <RecordCard
                  key={task.id}
                  title={task.title}
                  meta={`${task.priority} priority`}
                  onDelete={async () => {
                    await deleteTask(task.id);
                    await refresh();
                  }}
                >
                  <DetailRow label="Status" value={task.status} />
                  <DetailRow label="Assigned team" value={task.assigned_team || "Not assigned"} />
                  <DetailRow label="Issue category" value={task.issue_category || "Not classified"} />
                  <DetailRow label="Description" value={task.description || "No description"} />
                  <DetailRow label="Created" value={formatDate(task.created_at)} />
                  <DetailRow label="ID" value={task.id} />
                </RecordCard>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Notes</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Saved context and handoff notes</h3>
            </div>
            <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
              {state?.notes.length || 0} notes
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {(state?.notes || []).length === 0 ? (
              <p className="text-sm text-slate-400">No notes saved.</p>
            ) : (
              filteredNotes.map((note) => (
                <RecordCard
                  key={note.id}
                  title={note.title}
                  meta={formatDate(note.created_at)}
                  onDelete={async () => {
                    await deleteNote(note.id);
                    await refresh();
                  }}
                >
                  <DetailRow label="Body" value={note.body} />
                  <DetailRow label="ID" value={note.id} />
                </RecordCard>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
