import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { deleteEvent, fetchState } from "../api";
import type { Event, StateResponse } from "../types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

function eventStatusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "scheduled") return "border-blue-400/30 bg-blue-400/10 text-blue-700 dark:text-blue-200";
  if (normalized === "completed") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 dark:text-emerald-200";
  if (normalized === "cancelled") return "border-rose-400/30 bg-rose-400/10 text-rose-700 dark:text-rose-200";
  return "border-[var(--tf-border)] bg-[var(--tf-surface-muted)] text-[var(--tf-text-soft)]";
}

function compactCaseId(id?: string | null) {
  return id ? `TF-${id.slice(0, 4).toUpperCase()}` : "No case";
}

export function CalendarPage() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  async function refresh() {
    try {
      const nextState = await fetchState();
      setState(nextState);
      setError(null);
      setSelectedDay((current) => {
        if (current) return current;
        return nextState.events[0]?.start_at ? dayKey(nextState.events[0].start_at) : null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const events = useMemo(
    () => [...(state?.events || [])].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [state?.events]
  );

  const casesById = useMemo(() => new Map((state?.cases || []).map((supportCase) => [supportCase.id, supportCase])), [state?.cases]);
  const tasksByCaseId = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const task of state?.tasks || []) {
      if (task.case_id) grouped.set(task.case_id, (grouped.get(task.case_id) || 0) + 1);
    }
    return grouped;
  }, [state?.tasks]);

  const groupedDays = useMemo(() => {
    const grouped = new Map<string, Event[]>();
    for (const event of events) {
      const key = dayKey(event.start_at);
      grouped.set(key, [...(grouped.get(key) || []), event]);
    }
    return Array.from(grouped.entries());
  }, [events]);

  const selectedEvents = useMemo(() => {
    const key = selectedDay || groupedDays[0]?.[0];
    return key ? events.filter((event) => dayKey(event.start_at) === key) : [];
  }, [events, groupedDays, selectedDay]);

  async function removeEvent(eventId: string) {
    await deleteEvent(eventId);
    await refresh();
  }

  return (
    <div className="grid min-h-[calc(100vh-3.5rem)] bg-[var(--tf-bg)] xl:grid-cols-[340px_1fr]">
      <aside className="border-r border-[var(--tf-border)] bg-[var(--tf-surface)]">
        <div className="border-b border-[var(--tf-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--tf-text)]">Calendar</h2>
          <p className="text-xs text-[var(--tf-text-muted)]">{events.length} scheduled events</p>
        </div>

        <div className="p-3">
          {error ? <p className="mb-3 text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
          {groupedDays.length === 0 ? (
            <div className="rounded-md border border-[var(--tf-border)] p-4 text-sm text-[var(--tf-text-muted)]">
              No callbacks scheduled. Run a workflow with a scheduling request.
            </div>
          ) : (
            <div className="space-y-1">
              {groupedDays.map(([key, dayEvents]) => {
                const active = key === (selectedDay || groupedDays[0]?.[0]);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                      active
                        ? "bg-[var(--tf-row-active)] text-[var(--tf-text)]"
                        : "text-[var(--tf-text-soft)] hover:bg-[var(--tf-row-hover)]"
                    }`}
                  >
                    <span>{formatDate(dayEvents[0].start_at)}</span>
                    <span className="text-xs text-[var(--tf-text-muted)]">{dayEvents.length}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="min-w-0">
        <div className="border-b border-[var(--tf-border)] bg-[var(--tf-surface)] px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase text-[var(--tf-text-muted)]">Scheduled callbacks</p>
            <h1 className="mt-1 text-lg font-semibold text-[var(--tf-text)]">
              {selectedEvents[0] ? formatDate(selectedEvents[0].start_at) : "No selected day"}
            </h1>
          </div>
        </div>

        <div className="p-5">
          {selectedEvents.length === 0 ? (
            <div className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)] p-5 text-sm text-[var(--tf-text-muted)]">
              No events on this day.
            </div>
          ) : (
            <div className="divide-y divide-[var(--tf-border)] rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface)]">
              {selectedEvents.map((event) => {
                const supportCase = event.case_id ? casesById.get(event.case_id) : null;
                return (
                  <article key={event.id} className="grid gap-4 p-4 lg:grid-cols-[110px_1fr_180px]">
                    <div>
                      <p className="text-sm font-medium text-[var(--tf-text)]">{formatTime(event.start_at)}</p>
                      <p className="mt-1 text-xs text-[var(--tf-text-muted)]">{formatTime(event.end_at)}</p>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-[var(--tf-text)]">{event.title}</h3>
                        <span className={`rounded-md border px-2 py-0.5 text-xs ${eventStatusClass(event.status)}`}>
                          {event.status}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--tf-text-soft)]">
                        {event.description || "No event notes."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--tf-text-muted)]">
                        <span className="rounded-md border border-[var(--tf-border)] px-2 py-1">
                          {compactCaseId(event.case_id)}
                        </span>
                        <span className="rounded-md border border-[var(--tf-border)] px-2 py-1">
                          {supportCase?.assigned_team || "Unassigned team"}
                        </span>
                        <span className="rounded-md border border-[var(--tf-border)] px-2 py-1">
                          {event.case_id ? `${tasksByCaseId.get(event.case_id) || 0} linked tasks` : "No linked tasks"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-start justify-end gap-2">
                      {event.case_id ? (
                        <Link
                          to={`/cases/${event.case_id}`}
                          className="rounded-md border border-[var(--tf-border)] px-3 py-1.5 text-sm text-[var(--tf-text-soft)] hover:bg-[var(--tf-row-hover)]"
                        >
                          Open case
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void removeEvent(event.id)}
                        className="rounded-md border border-rose-400/30 px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
