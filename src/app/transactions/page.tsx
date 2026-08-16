"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type TransactionType = "income" | "expense";

type Transaction = {
  id: string;
  date: string;
  name: string;
  type: TransactionType;
  category: string | null;
  amount: number | string;
  description: string;
  notes: string | null;
};

type TransactionForm = {
  date: string;
  name: string;
  type: TransactionType;
  category: string;
  amount: string;
  description: string;
  notes: string;
};

type FeedbackMessage = {
  kind: "success" | "error";
  text: string;
};

type TypeFilter = "all" | TransactionType;

type Filters = {
  type: TypeFilter;
  category: string;
  dateFrom: string;
  dateTo: string;
};

const defaultEventId = process.env.NEXT_PUBLIC_DEFAULT_EVENT_ID;
const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID;

const categoryOptions: Record<TransactionType, string[]> = {
  income: ["levy", "donation"],
  expense: ["food", "decoration", "transport"],
};

const emptyForm: TransactionForm = {
  date: "",
  name: "",
  type: "income",
  category: "",
  amount: "",
  description: "",
  notes: "",
};

const emptyFilters: Filters = {
  type: "all",
  category: "all",
  dateFrom: "",
  dateTo: "",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatAmount(amount: number | string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function getAmount(amount: number | string) {
  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!supabase) {
      return { data: [] as Transaction[], error: null };
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, name, type, category, amount, description, notes")
      .order("date", { ascending: false });

    return { data: (data ?? []) as Transaction[], error };
  }, []);

  function updateField<Field extends keyof TransactionForm>(
    field: Field,
    value: TransactionForm[Field],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function refreshTransactions() {
    const { data, error } = await fetchTransactions();

    if (error) {
      setMessage({ kind: "error", text: error.message });
      setTransactions([]);
    } else {
      setTransactions(data);
    }
  }

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  }

  function openEditForm(transaction: Transaction) {
    setEditingId(transaction.id);
    setForm({
      date: transaction.date,
      name: transaction.name,
      type: transaction.type,
      category: transaction.category ?? "",
      amount: String(getAmount(transaction.amount)),
      description: transaction.description,
      notes: transaction.notes ?? "",
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage({ kind: "error", text: "Supabase is not configured." });
      return;
    }

    if (!editingId && (!defaultEventId || !organizationId)) {
      setMessage({
        kind: "error",
        text: "Add NEXT_PUBLIC_DEFAULT_EVENT_ID and NEXT_PUBLIC_ORGANIZATION_ID to your environment.",
      });
      return;
    }

    const amount = Number(form.amount);
    const basePayload = {
      date: form.date,
      name: form.name.trim(),
      type: form.type,
      category: form.category || null,
      amount,
      description: form.description.trim(),
      notes: form.notes.trim() || null,
    };

    if (!basePayload.date || !basePayload.name || !basePayload.description) {
      setMessage({
        kind: "error",
        text: "Date, name, type, amount, and description are required.",
      });
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage({ kind: "error", text: "Amount must be greater than 0." });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const { error } = editingId
      ? await supabase
          .from("transactions")
          .update(basePayload)
          .eq("id", editingId)
      : await supabase.from("transactions").insert({
          ...basePayload,
          event_id: defaultEventId,
          organization_id: organizationId,
        });

    if (error) {
      setMessage({ kind: "error", text: error.message });
    } else {
      setMessage({
        kind: "success",
        text: editingId ? "Transaction updated." : "Transaction saved.",
      });
      closeForm();
      await refreshTransactions();
    }

    setIsSaving(false);
  }

  async function handleDelete(transaction: Transaction) {
    if (!supabase) {
      setMessage({ kind: "error", text: "Supabase is not configured." });
      return;
    }

    const confirmed = window.confirm(
      `Delete "${transaction.description}" (${formatAmount(
        transaction.amount,
      )})? This can't be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(transaction.id);
    setMessage(null);

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transaction.id);

    if (error) {
      setMessage({ kind: "error", text: error.message });
    } else {
      setMessage({ kind: "success", text: "Transaction deleted." });
      if (expandedNotesId === transaction.id) {
        setExpandedNotesId(null);
      }
      await refreshTransactions();
    }

    setDeletingId(null);
  }

  useEffect(() => {
    let isActive = true;

    async function loadTransactions() {
      const { data, error } = await fetchTransactions();

      if (!isActive) {
        return;
      }

      if (error) {
        setMessage({ kind: "error", text: error.message });
        setTransactions([]);
      } else {
        setTransactions(data);
      }

      setIsLoading(false);
    }

    void loadTransactions();

    return () => {
      isActive = false;
    };
  }, [fetchTransactions]);

  // Auto-dismiss success messages so they don't linger and get mistaken
  // for a stuck state; errors stay until the user acts again.
  useEffect(() => {
    if (message?.kind !== "success") {
      return;
    }

    const timeout = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [message]);

  // Lock body scroll and support Escape-to-close while the form panel is open.
  useEffect(() => {
    if (!isFormOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstFieldRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeForm();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFormOpen]);

  const categoryFilterOptions = useMemo(() => {
    const relevant = transactions.filter(
      (transaction) =>
        filters.type === "all" || transaction.type === filters.type,
    );

    return Array.from(
      new Set(
        relevant
          .map((transaction) => transaction.category)
          .filter((category): category is string => Boolean(category)),
      ),
    ).sort((first, second) => first.localeCompare(second));
  }, [transactions, filters.type]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (filters.type !== "all" && transaction.type !== filters.type) {
        return false;
      }

      if (
        filters.category !== "all" &&
        (transaction.category ?? "") !== filters.category
      ) {
        return false;
      }

      if (filters.dateFrom && transaction.date < filters.dateFrom) {
        return false;
      }

      if (filters.dateTo && transaction.date > filters.dateTo) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  const areFiltersActive =
    filters.type !== "all" ||
    filters.category !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  function updateFilter<Field extends keyof Filters>(
    field: Field,
    value: Filters[Field],
  ) {
    setFilters((current) => ({
      ...current,
      [field]: value,
      ...(field === "type" ? { category: "all" } : {}),
    }));
  }

  const totalIncome = filteredTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + getAmount(transaction.amount), 0);

  const totalExpenses = filteredTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + getAmount(transaction.amount), 0);

  const balance = totalIncome - totalExpenses;
  const balanceClass = balance >= 0 ? "text-emerald-700" : "text-red-700";

  function exportToExcel() {
    if (filteredTransactions.length === 0) {
      setMessage({ kind: "error", text: "No transactions to export." });
      return;
    }

    const summaryRows = [
      ["Total Income", totalIncome],
      ["Total Expenses", totalExpenses],
      ["Balance", balance],
    ]
      .map(
        ([label, value]) =>
          `<tr><td>${escapeHtml(String(label))}</td><td>${formatAmount(
            value as number,
          )}</td></tr>`,
      )
      .join("");

    const transactionRows = filteredTransactions
      .map(
        (transaction) => `
          <tr>
            <td>${escapeHtml(transaction.date)}</td>
            <td>${escapeHtml(transaction.name)}</td>
            <td>${escapeHtml(transaction.type)}</td>
            <td>${escapeHtml(transaction.category ?? "")}</td>
            <td>${escapeHtml(transaction.description)}</td>
            <td>${getAmount(transaction.amount)}</td>
            <td>${escapeHtml(transaction.notes ?? "")}</td>
          </tr>
        `,
      )
      .join("");

    const workbook = `
      <html>
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <table>
            <tr><th colspan="2">Summary</th></tr>
            ${summaryRows}
          </table>
          <br />
          <table>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Type</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Notes</th>
            </tr>
            ${transactionRows}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([workbook], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "transactions.xls";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">Finance</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Transactions
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportToExcel}
            disabled={isLoading || filteredTransactions.length === 0}
            className="w-fit rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400"
          >
            Export to Excel
          </button>
          <button
            type="button"
            onClick={openAddForm}
            disabled={!isSupabaseConfigured}
            className="w-fit rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            Add transaction
          </button>
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
        </div>
      ) : null}

      {message ? (
        <p
          role="status"
          className={`mt-6 rounded-md border p-3 text-sm ${
            message.kind === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Total income</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-emerald-700">
            {isLoading ? "-" : formatAmount(totalIncome)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Total expenses</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-red-700">
            {isLoading ? "-" : formatAmount(totalExpenses)}
          </p>
        </div>
        <div className="rounded-md border border-zinc-200 bg-white p-5">
          <p className="text-sm font-medium text-zinc-500">Balance</p>
          <p
            className={`mt-3 text-3xl font-semibold tracking-tight ${balanceClass}`}
          >
            {isLoading ? "-" : formatAmount(balance)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-4 rounded-md border border-zinc-200 bg-white p-4">
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Type</span>
          <select
            value={filters.type}
            onChange={(event) =>
              updateFilter("type", event.target.value as TypeFilter)
            }
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-zinc-500"
          >
            <option value="all">All</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Category</span>
          <select
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm capitalize outline-none transition focus:border-zinc-500"
          >
            <option value="all">All categories</option>
            {categoryFilterOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-500">From</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => updateFilter("dateFrom", event.target.value)}
            className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none transition focus:border-zinc-500"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-500">To</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => updateFilter("dateTo", event.target.value)}
            className="mt-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none transition focus:border-zinc-500"
          />
        </label>

        {areFiltersActive ? (
          <button
            type="button"
            onClick={() => setFilters(emptyFilters)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
          >
            Clear filters
          </button>
        ) : null}

        {!isLoading ? (
          <p className="ml-auto text-xs text-zinc-500">
            {filteredTransactions.length} of {transactions.length}{" "}
            transaction{transactions.length === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={7}>
                  Loading transactions...
                </td>
              </tr>
            ) : filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => {
                const colorClass =
                  transaction.type === "income"
                    ? "text-emerald-700"
                    : "text-red-700";
                const isExpanded = expandedNotesId === transaction.id;
                const isDeleting = deletingId === transaction.id;

                return (
                  <>
                    <tr key={transaction.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {transaction.name}
                      </td>
                      <td
                        className={`px-4 py-3 font-medium capitalize ${colorClass}`}
                      >
                        {transaction.type}
                      </td>
                      <td className="px-4 py-3 capitalize text-zinc-600">
                        {transaction.category ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-zinc-600">
                        <div className="flex items-center gap-2">
                          <span>{transaction.description}</span>
                          {transaction.notes ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedNotesId(
                                  isExpanded ? null : transaction.id,
                                )
                              }
                              className="shrink-0 rounded-md px-2 py-0.5 text-xs font-medium text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-100"
                            >
                              {isExpanded ? "Hide notes" : "Notes"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${colorClass}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatAmount(transaction.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEditForm(transaction)}
                          className="rounded-md px-2.5 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(transaction)}
                          disabled={isDeleting}
                          className="rounded-md px-2.5 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr key={`${transaction.id}-notes`}>
                        <td
                          colSpan={7}
                          className="bg-zinc-50 px-4 py-3 text-sm text-zinc-600"
                        >
                          <span className="font-medium text-zinc-700">
                            Notes:
                          </span>{" "}
                          {transaction.notes}
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })
            ) : transactions.length > 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={7}>
                  No transactions match these filters.
                </td>
              </tr>
            ) : (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={7}>
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close form"
            onClick={closeForm}
            className="absolute inset-0 bg-zinc-950/30"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-form-title"
            className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h2
                id="transaction-form-title"
                className="text-base font-semibold"
              >
                {editingId ? "Edit transaction" : "Add transaction"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close"
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-1 flex-col">
              <div className="grid flex-1 gap-5 content-start">
                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Date
                  </span>
                  <input
                    ref={firstFieldRef}
                    value={form.date}
                    onChange={(event) =>
                      updateField("date", event.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
                    type="date"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Type
                  </span>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value as TransactionType,
                        category: "",
                      }))
                    }
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
                    required
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Name
                  </span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
                    placeholder="Member or sponsor name"
                    type="text"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Category
                  </span>
                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateField("category", event.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm capitalize outline-none transition focus:border-zinc-500"
                  >
                    <option value="">No category</option>
                    {categoryOptions[form.type].map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Amount (₦)
                  </span>
                  <input
                    value={form.amount}
                    onChange={(event) =>
                      updateField("amount", event.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
                    min="0.01"
                    step="0.01"
                    type="number"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Description
                  </span>
                  <input
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
                    placeholder="Short description"
                    type="text"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-zinc-700">
                    Notes
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    className="mt-1 min-h-24 w-full resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
                    placeholder="Optional notes"
                  />
                </label>
              </div>

              <div className="mt-6 flex gap-2 border-t border-zinc-100 pt-4">
                <button
                  type="submit"
                  disabled={isSaving || !isSupabaseConfigured}
                  className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {isSaving
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Save transaction"}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
