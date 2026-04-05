import { Link } from "react-router-dom";

const details = [
  "Classifies support issues and assigns the likely owning team.",
  "Creates follow-up tasks and reminder events from one conversation.",
  "Groups customers, cases, tasks, notes, and runs in one operator workflow.",
];

export function HomePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 px-8 py-14 text-center shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
          TicketFlow Agent
        </p>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-6xl">
          Support follow-up, triage, and scheduling.
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Built for a support lead who needs to move quickly from issue intake to action. TicketFlow turns a live chat
          conversation into a customer-linked support case with a summary, ownership, follow-up tasks, reminders, and
          saved context.
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

      <section className="grid gap-4 md:grid-cols-3">
        {details.map((detail) => (
          <article
            key={detail}
            className="rounded-2xl border border-black/10 bg-white/85 p-6 shadow-lg shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/20"
          >
            <p className="text-sm leading-7 text-slate-700 dark:text-slate-300">{detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
