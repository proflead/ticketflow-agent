import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { RecordsPage } from "./pages/RecordsPage";
import { WorkflowPage } from "./pages/WorkflowPage";
import { LoginPage } from "./pages/LoginPage";
import { RunsPage } from "./pages/RunsPage";
import { TasksPage } from "./pages/TasksPage";
import { CustomersPage } from "./pages/CustomersPage";

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07 6.7 17.3M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 15.5A8.5 8.5 0 1 1 8.5 4 7 7 0 0 0 20 15.5Z" />
    </svg>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-4 py-2 text-sm font-medium transition ${
          isActive
            ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
            : "text-slate-600 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("ticketflow-theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      return;
    }

    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(systemPrefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("ticketflow-theme", theme);
  }, [theme]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-950 transition-colors dark:bg-slate-950 dark:text-white">
      <header className="border-b border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              TicketFlow Agent
            </p>
            <h1 className="text-xl font-semibold text-slate-950 dark:text-white">Support Follow-Up Workspace</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <NavItem to="/" label="Home" />
            <NavItem to="/workflow" label="Run Workflow" />
            <NavItem to="/tasks" label="Tasks" />
            <NavItem to="/customers" label="Customers" />
            <NavItem to="/records" label="Support Cases" />
            <NavItem to="/runs" label="Run Logs" />
            <NavLink
              to="/login"
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
            >
              Login
            </NavLink>
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
              aria-label="Toggle dark and light theme"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workflow" element={<WorkflowPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/runs" element={<RunsPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>

      <footer className="mx-auto w-full max-w-7xl px-6 pb-8 pt-2">
        <div className="border-t border-black/10 pt-4 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
          <p>
            Built by{" "}
            <a
              href="https://proflead.dev"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-slate-400 underline-offset-4 hover:text-slate-950 dark:hover:text-white"
            >
              https://proflead.dev
            </a>
            , Vladislav Guzey 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
