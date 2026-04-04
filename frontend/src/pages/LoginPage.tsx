export function LoginPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-black/10 bg-white/90 p-8 text-center shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/30">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Login</p>
      <h2 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">Authentication placeholder</h2>
      <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
        This page is intentionally a placeholder for the hackathon. The next iteration would add real sign-in and
        per-user workspaces, but the current MVP stays single-user to keep the product flow demoable.
      </p>
      <button
        type="button"
        className="mt-6 rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-slate-900 hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
      >
        Continue later
      </button>
    </div>
  );
}
