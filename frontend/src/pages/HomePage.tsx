import { Link } from "react-router-dom";

const flows = [
  {
    title: "Support Issue Triage",
    body: "Turn a raw customer issue into a follow-up task, a reminder block, and a saved note for context.",
  },
  {
    title: "Meeting Follow-Up",
    body: "Paste meeting notes and convert action items into tasks while keeping the notes searchable.",
  },
  {
    title: "Daily Review",
    body: "See open tasks, scheduled events, and saved notes in one place without digging through separate tools.",
  },
];

export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-8 shadow-2xl shadow-cyan-950/30">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Who this is for</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            A support or customer-success lead who needs one place to turn messy conversations into action.
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
            TicketFlow Agent helps a single operator capture an issue or meeting, create the follow-up tasks,
            reserve time for the next action, and store the context so nothing gets lost.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/workflow"
              className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Run a workflow
            </Link>
            <Link
              to="/records"
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              View saved records
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
          <h3 className="text-lg font-semibold text-white">Why it exists</h3>
          <ul className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
            <li>Customer issues often start as unstructured text in chats, meetings, or support handoffs.</li>
            <li>Operators waste time copying details into separate tools for tasks, calendars, and notes.</li>
            <li>This app gives one prompt-driven workspace that records the work and the context together.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {flows.map((flow) => (
          <article key={flow.title} className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <h3 className="text-lg font-semibold text-white">{flow.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{flow.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
