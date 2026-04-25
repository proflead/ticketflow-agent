import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  const [search, setSearch] = useState("");

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

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const customers = [...(state?.customers || [])];
    if (!query) return customers;
    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone].some((value) => value?.toLowerCase().includes(query))
    );
  }, [search, state?.customers]);

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
    <div className="space-y-4 p-5">
      <section className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-6  ">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Customers</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--tf-text)] ">Select a customer to see their cases and tasks.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">
              When a conversation includes customer contact details, TicketFlow creates or updates a customer record
              and links the case and all follow-up tasks to that customer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-md border border-[var(--tf-border)] px-4 py-2 text-sm text-[var(--tf-text)] hover:bg-[var(--tf-surface-muted)]   dark:hover:bg-[var(--tf-surface)]/10"
          >
            Refresh
          </button>
        </div>
        {error ? <p className="mt-4 text-sm text-rose-500 dark:text-rose-300">{error}</p> : null}
        <div className="mt-6 max-w-md">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by customer name, email, or phone"
            className="w-full rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] px-4 py-3 text-sm text-[var(--tf-text)] placeholder:text-[var(--tf-text-muted)]    dark:placeholder:text-[var(--tf-text-muted)]"
          />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-6  ">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-[var(--tf-text)] ">Customer records</h3>
            <span className="rounded-md border border-[var(--tf-border)] px-3 py-1 text-xs text-[var(--tf-text-muted)]  dark:text-[var(--tf-text-soft)]">
              {state?.customers.length || 0} customers
            </span>
          </div>

          <div className="mt-6 space-y-3">
            {(state?.customers || []).length === 0 ? (
              <p className="text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">No customers match this search yet.</p>
            ) : (
              filteredCustomers.map((customer: Customer) => {
                const linkedCases = (state?.cases || []).filter((supportCase) => supportCase.customer_id === customer.id);
                const linkedTasks = (state?.tasks || []).filter((task) => task.customer_id === customer.id);
                return (
                <div
                  key={customer.id}
                  className={`rounded-lg border p-4 transition ${
                    selectedCustomerId === customer.id
                      ? "border-blue-400/30 bg-[var(--tf-surface-muted)] dark:border-slate-500/40 dark:bg-[var(--tf-surface-muted)]"
                      : "border-[var(--tf-border)] bg-[var(--tf-surface)]/70  dark:bg-[var(--tf-surface-muted)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => setSelectedCustomerId(customer.id)} className="flex-1 text-left">
                      <p className="text-base font-semibold text-[var(--tf-text)] ">{customer.name || customer.email || customer.phone || "Unknown customer"}</p>
                      <p className="mt-2 text-sm text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{customer.email || "No email saved"}</p>
                      <p className="mt-1 text-sm text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{customer.phone || "No phone saved"}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                          {linkedCases.length} case{linkedCases.length === 1 ? "" : "s"}
                        </span>
                        <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                          {linkedTasks.length} task{linkedTasks.length === 1 ? "" : "s"}
                        </span>
                      </div>
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
                      className="rounded-md border border-rose-400/30 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-400/10 dark:text-rose-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )})
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[var(--tf-border)] bg-[var(--tf-surface)] p-6  ">
          {!selectedCustomer ? (
            <p className="text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">Select a customer to inspect linked cases and tasks.</p>
          ) : (
            <div className="space-y-4 p-5">
              <div>
                <h3 className="text-xl font-semibold text-[var(--tf-text)] ">
                  {selectedCustomer.name || selectedCustomer.email || "Customer record"}
                </h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Email</p>
                    <p className="mt-2 text-sm text-[var(--tf-text)] ">{selectedCustomer.email || "Not captured"}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Phone</p>
                    <p className="mt-2 text-sm text-[var(--tf-text)] ">{selectedCustomer.phone || "Not captured"}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--tf-border)] p-4 ">
                    <p className="text-xs uppercase text-[var(--tf-text-muted)]">Created</p>
                    <p className="mt-2 text-sm text-[var(--tf-text)] ">{formatDate(selectedCustomer.created_at)}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                    {customerCases.length} case{customerCases.length === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                    {customerTasks.length} task{customerTasks.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-[var(--tf-text)] ">Linked cases</h4>
                <div className="mt-4 space-y-3">
                  {customerCases.length === 0 ? (
                    <p className="text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">No cases linked to this customer yet.</p>
                  ) : (
                    customerCases.map((supportCase) => (
                      <div key={supportCase.id} className="rounded-lg border border-[var(--tf-border)] p-4 ">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-base font-semibold text-[var(--tf-text)] ">{supportCase.title}</p>
                          <Link
                            to={`/cases/${supportCase.id}`}
                            className="rounded-md border border-[var(--tf-border)] px-3 py-1 text-xs text-[var(--tf-text-soft)] hover:bg-[var(--tf-surface-muted)]  dark:text-[var(--tf-text-soft)] dark:hover:bg-[var(--tf-surface)]/10"
                          >
                            Open case
                          </Link>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{supportCase.source_text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-[var(--tf-text)] ">Linked tasks</h4>
                <div className="mt-4 space-y-3">
                  {customerTasks.length === 0 ? (
                    <p className="text-sm text-[var(--tf-text-muted)] dark:text-[var(--tf-text-muted)]">No tasks linked to this customer yet.</p>
                  ) : (
                    customerTasks.map((task) => (
                      <div key={task.id} className="rounded-lg border border-[var(--tf-border)] p-4 ">
                        <div className="flex flex-wrap gap-2">
                          {task.assigned_team ? (
                            <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                              {task.assigned_team}
                            </span>
                          ) : null}
                          {task.assigned_member ? (
                            <span className="rounded-md bg-[var(--tf-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--tf-text-soft)] dark:bg-[var(--tf-surface-muted)] dark:text-[var(--tf-text-soft)]">
                              {task.assigned_member}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-base font-semibold text-[var(--tf-text)] ">{task.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--tf-text-soft)] dark:text-[var(--tf-text-soft)]">{task.description || "No description available."}</p>
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
