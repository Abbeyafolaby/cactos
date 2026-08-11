"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type TransactionType = "income" | "expense";

type Transaction = {
  id: string;
  date: string;
  name: string;
  type: TransactionType;
  amount: number | string;
  description: string;
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

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatAmount(amount: number | string) {
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function getAmount(amount: number | string) {
  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState<TransactionForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!supabase) {
      return { data: [] as Transaction[], error: null };
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, name, type, amount, description")
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
      setMessage(error.message);
      setTransactions([]);
    } else {
      setTransactions(data);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    if (!defaultEventId || !organizationId) {
      setMessage(
        "Add NEXT_PUBLIC_DEFAULT_EVENT_ID and NEXT_PUBLIC_ORGANIZATION_ID to your environment.",
      );
      return;
    }

    const amount = Number(form.amount);
    const payload = {
      event_id: defaultEventId,
      organization_id: organizationId,
      date: form.date,
      name: form.name.trim(),
      type: form.type,
      category: form.category || null,
      amount,
      description: form.description.trim(),
      notes: form.notes.trim() || null,
    };

    if (!payload.date || !payload.name || !payload.description) {
      setMessage("Date, name, type, amount, and description are required.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Amount must be greater than 0.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const { error } = await supabase.from("transactions").insert(payload);

    if (error) {
      setMessage(error.message);
    } else {
      setForm(emptyForm);
      setMessage("Transaction saved.");
      await refreshTransactions();
    }

    setIsSaving(false);
  }

  useEffect(() => {
    let isActive = true;

    async function loadTransactions() {
      const { data, error } = await fetchTransactions();

      if (!isActive) {
        return;
      }

      if (error) {
        setMessage(error.message);
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

  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + getAmount(transaction.amount), 0);

  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + getAmount(transaction.amount), 0);

  const balance = totalIncome - totalExpenses;
  const balanceClass = balance >= 0 ? "text-emerald-700" : "text-red-700";

  return (
    <section className="max-w-6xl">
      <div>
        <p className="text-sm font-medium text-zinc-500">Finance</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Transactions
        </h1>
      </div>

      {!isSupabaseConfigured ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
        </div>
      ) : null}

      {message ? (
        <p className="mt-6 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-md border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <h2 className="text-base font-semibold">Add transaction</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Date</span>
            <input
              value={form.date}
              onChange={(event) => updateField("date", event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
              type="date"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Type</span>
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
            <span className="text-sm font-medium text-zinc-700">Name</span>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
              placeholder="Member or sponsor name"
              type="text"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Category</span>
            <select
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
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
            <span className="text-sm font-medium text-zinc-700">Amount</span>
            <input
              value={form.amount}
              onChange={(event) => updateField("amount", event.target.value)}
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

          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              className="mt-1 min-h-24 w-full resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
              placeholder="Optional notes"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isSaving || !isSupabaseConfigured}
          className="mt-5 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isSaving ? "Saving..." : "Save transaction"}
        </button>
      </form>

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

      <div className="mt-8 overflow-hidden rounded-md border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                  Loading transactions...
                </td>
              </tr>
            ) : transactions.length > 0 ? (
              transactions.map((transaction) => {
                const colorClass =
                  transaction.type === "income"
                    ? "text-emerald-700"
                    : "text-red-700";

                return (
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
                    <td className="px-4 py-3 text-zinc-600">
                      {transaction.description}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${colorClass}`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatAmount(transaction.amount)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={5}>
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
