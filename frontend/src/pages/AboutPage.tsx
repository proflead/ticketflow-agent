import { Link } from "react-router-dom";

const details = [
  "Classifies support issues and assigns the likely owning team.",
  "Creates follow-up tasks and reminder events from one prompt.",
  "Groups notes, tasks, events, and runs under a support case.",
];

export function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-[2rem] border border-black/10 bg-white/90 p-8 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">About</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Built for a support lead who needs to move quickly from issue intake to action.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
          TicketFlow Agent helps support and customer-success teams turn unstructured issue reports, meeting notes, and
          follow-up requests into a support case with clear ownership and next steps.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/workflow"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
          >
            Run workflow
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
