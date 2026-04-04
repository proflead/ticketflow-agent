import { NavLink, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { RecordsPage } from "./pages/RecordsPage";
import { WorkflowPage } from "./pages/WorkflowPage";
import { LoginPage } from "./pages/LoginPage";
import { RunsPage } from "./pages/RunsPage";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-4 py-2 text-sm font-medium transition ${
          isActive ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)]">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">TicketFlow Agent</p>
            <h1 className="text-xl font-semibold text-white">Support Follow-Up Workspace</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <NavItem to="/" label="Overview" />
            <NavItem to="/workflow" label="Run Workflow" />
            <NavItem to="/records" label="Records" />
            <NavItem to="/runs" label="Workflow Runs" />
            <NavLink
              to="/login"
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Login
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workflow" element={<WorkflowPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  );
}
