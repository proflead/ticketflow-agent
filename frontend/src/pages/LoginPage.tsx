export function LoginPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-8 text-center  /80">
      <p className="text-sm font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Login</p>
      <h2 className="mt-3 text-3xl font-semibold text-[var(--tf-text)] ">Authentication placeholder</h2>
      <p className="mt-4 text-sm leading-7 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">
        Authentication is not enabled in this local workspace. Production deployments should connect this surface to
        identity, role-based access, and per-user workspaces.
      </p>
      <button
        type="button"
        className="mt-6 rounded-md border border-[var(--tf-border)] px-5 py-3 text-sm font-medium text-[var(--tf-text)] hover:bg-[var(--tf-surface-muted)]   dark:hover:bg-[var(--tf-surface)]/10"
      >
        Continue later
      </button>
    </div>
  );
}
