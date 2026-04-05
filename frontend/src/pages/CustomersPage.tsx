import { useEffect, useMemo, useState } from "react";
import { deleteCustomer, fetchState } from "../api";
import { Customer, StateResponse } from "../types";

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export function CustomersPage() {
  const [state, setState] = useState<StateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  async function refresh() {
    try {
      setState(await fetchState());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const selectedCustomer = useMemo(
    () => (state?.customers || []).find((customer) => customer.id === selectedCustomerId) || null,
    [selectedCustomerId, state?.customers]
  );

  const customerCases = useMemo(
    () => (state?.cases || []).filter((supportCase) => supportCase.customer_id === selectedCustomerId),
    [selectedCustomerId, state?.cases]
  );
  const customerTasks = useMemo(
    () =>
      [...((state?.tasks || []).filter((task) => task.customer_id === selectedCustomerId))].sort(
        (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      ),
    [selectedCustomerId, state?.tasks]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Customers</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Select a customer to see their cases and tasks.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              When a conversation includes customer contact details, TicketFlow creates or updates a customer record
              and links the case and all follow-up tasks to that customer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full border border-black/10 px-4 py-2 text-sm text-slate-900 hover:bg-slate-100 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-slate-950 dark:text-white">Customer records</h3>
            <span className="rounded-full border border-black/10 px-3 py-1 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
              {state?.customers.length || 0} customers
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {(state?.customers || []).length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No customers captured yet.</p>
            ) : (
              state?.customers.map((customer: Customer) => (
                <div
                  key={customer.id}
                  className={`rounded-2xl border p-4 transition ${
                    selectedCustomerId === customer.id
                      ? "border-slate-400/50 bg-slate-100 dark:border-slate-500/40 dark:bg-slate-800"
                      : "border-black/10 bg-white/70 dark:border-white/10 dark:bg-slate-950/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => setSelectedCustomerId(customer.id)} className="flex-1 text-left">
                      <p className="text-base font-semibold text-slate-950 dark:text-white">{customer.name || customer.email || customer.phone || "Unknown customer"}</p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{customer.email || "No email saved"}</p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{customer.phone || "No phone saved"}</p>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteCustomer(customer.id);
                        if (selectedCustomerId === customer.id) {
                          setSelectedCustomerId(null);
                        }
                        await refresh();
                      }}
                      className="rounded-full border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-300 hover:bg-rose-400/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/90 p-6 shadow-xl shadow-black/5 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-black/30">
          {!selectedCustomer ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Select a customer to inspect linked cases and tasks.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-950 dark:text-white">
                  {selectedCustomer.name || selectedCustomer.email || "Customer record"}
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
                    <p className="mt-2 text-sm text-slate-950 dark:text-white">{selectedCustomer.email || "Not captured"}</p>
                  </div>
                  <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Phone</p>
                    <p className="mt-2 text-sm text-slate-950 dark:text-white">{selectedCustomer.phone || "Not captured"}</p>
                  </div>
                  <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Created</p>
                    <p className="mt-2 text-sm text-slate-950 dark:text-white">{formatDate(selectedCustomer.created_at)}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-950 dark:text-white">Linked cases</h4>
                <div className="mt-4 space-y-3">
                  {customerCases.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No cases linked to this customer yet.</p>
                  ) : (
                    customerCases.map((supportCase) => (
                      <div key={supportCase.id} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                        <p className="text-base font-semibold text-slate-950 dark:text-white">{supportCase.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{supportCase.source_text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-950 dark:text-white">Linked tasks</h4>
                <div className="mt-4 space-y-3">
                  {customerTasks.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No tasks linked to this customer yet.</p>
                  ) : (
                    customerTasks.map((task) => (
                      <div key={task.id} className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
                        <div className="flex flex-wrap gap-2">
                          {task.assigned_team ? (
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {task.assigned_team}
                            </span>
                          ) : null}
                          {task.assigned_member ? (
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {task.assigned_member}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-base font-semibold text-slate-950 dark:text-white">{task.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">{task.description || "No description available."}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
