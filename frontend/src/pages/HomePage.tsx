import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="mx-auto flex min-h-[72vh] max-w-4xl items-center justify-center">
      <section className="w-full rounded-[2rem] border border-black/10 bg-white/90 px-8 py-14 text-center shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
          TicketFlow Agent
        </p>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-6xl">
          Support follow-up, triage, and scheduling.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          A single workspace for turning support issues and handoff notes into an assigned case, actionable tasks,
          scheduled reminders, and saved context.
        </p>
        <div className="mt-10 flex justify-center">
          <Link
            to="/workflow"
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Go to run workflow
          </Link>
        </div>
      </section>
    </div>
  );
}
