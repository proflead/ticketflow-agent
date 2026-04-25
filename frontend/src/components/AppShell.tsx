import { ReactNode, useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import ticketflowLogo from "../assets/ticketflow-logo.svg";

const navItems = [
  { to: "/", label: "Support Queue" },
  { to: "/workflow", label: "Run Workflow" },
  { to: "/records", label: "Cases" },
  { to: "/tasks", label: "Tasks" },
  { to: "/calendar", label: "Calendar" },
  { to: "/customers", label: "Customers" },
  { to: "/runs", label: "Traces" },
];

function ThemeIcon({ mode }: { mode: "dark" | "light" }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      {mode === "dark" ? <path d="M13 10.2A5.8 5.8 0 1 1 5.8 3 4.8 4.8 0 0 0 13 10.2Z" /> : <circle cx="8" cy="8" r="3.2" />}
    </svg>
  );
}

function Sidebar({ theme, setTheme }: { theme: "dark" | "light"; setTheme: (theme: "dark" | "light") => void }) {
  return (
    <aside className="hidden border-r border-[var(--tf-border)] bg-[var(--tf-sidebar)] lg:flex lg:flex-col">
      <div className="border-b border-[var(--tf-border)] px-4 py-4">
        <Link to="/" className="flex items-center gap-3 rounded-md transition hover:bg-[var(--tf-row-hover)]">
          <img src={ticketflowLogo} alt="TicketFlow" className="h-10 w-10 rounded-md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--tf-text)]">TicketFlow</p>
            <p className="truncate text-xs text-[var(--tf-text-muted)]">Support Operations</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-md px-2.5 py-1.5 text-sm transition ${
                isActive
                  ? "bg-[var(--tf-row-active)] text-[var(--tf-text)]"
                  : "text-[var(--tf-text-muted)] hover:bg-[var(--tf-row-hover)] hover:text-[var(--tf-text-soft)]"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[var(--tf-border)] p-3">
        <div className="rounded-md border border-[var(--tf-border)] bg-[var(--tf-surface-muted)] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--tf-text-muted)]">System status</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--tf-text-soft)]">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              healthy
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--tf-text-muted)]">Fallback</span>
            <span className="text-xs text-[var(--tf-text-soft)]">active</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-[var(--tf-border)] px-2.5 py-1.5 text-xs text-[var(--tf-text-muted)] hover:bg-[var(--tf-row-hover)] hover:text-[var(--tf-text-soft)]"
        >
          <ThemeIcon mode={theme} />
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <header className="border-b border-[var(--tf-border)] bg-[var(--tf-bg)]">
      <div className="flex min-h-14 items-center justify-between gap-4 px-4 lg:px-5">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-[var(--tf-text)]">Support Queue</h1>
          <p className="truncate text-xs text-[var(--tf-text-muted)]">AI-assisted follow-up workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/runs"
            className="hidden rounded-md border border-[var(--tf-border)] px-3 py-1.5 text-sm text-[var(--tf-text-soft)] hover:bg-[var(--tf-row-hover)] md:inline-flex"
          >
            View trace
          </Link>
          <Link to="/workflow" className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-400">
            Run workflow
          </Link>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-[var(--tf-border)] px-3 py-2 lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm ${
                isActive
                  ? "bg-[var(--tf-row-active)] text-[var(--tf-text)]"
                  : "text-[var(--tf-text-muted)] hover:bg-[var(--tf-row-hover)]"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const storedTheme = window.localStorage.getItem("ticketflow-theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("ticketflow-theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-[var(--tf-bg)] text-[var(--tf-text-soft)]">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[232px_1fr]">
        <Sidebar theme={theme} setTheme={setTheme} />
        <div className="flex min-w-0 flex-col">
          <TopBar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
