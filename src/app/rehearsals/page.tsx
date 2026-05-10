"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type Rehearsal = {
  id: string;
  date: string;
  note: string | null;
};

const emptyForm = {
  date: "",
  note: "",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function getRehearsalErrorMessage(errorMessage: string) {
  if (errorMessage.includes("row-level security policy")) {
    return [
      "Supabase is blocking rehearsal writes with row-level security.",
      "Run supabase/fix-rehearsals-rls.sql in the Supabase SQL Editor, then try again.",
    ].join(" ");
  }

  return errorMessage;
}

export default function RehearsalsPage() {
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchRehearsals = useCallback(async () => {
    if (!supabase) {
      return { data: [] as Rehearsal[], error: null };
    }

    const { data, error } = await supabase
      .from("rehearsals")
      .select("id, date, note")
      .order("date", { ascending: false });

    return { data: (data ?? []) as Rehearsal[], error };
  }, []);

  async function loadRehearsals() {
    setIsLoading(true);
    setMessage(null);

    const { data, error } = await fetchRehearsals();

    if (error) {
      setMessage(error.message);
      setRehearsals([]);
    } else {
      setRehearsals(data);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let isActive = true;

    async function loadInitialRehearsals() {
      const { data, error } = await fetchRehearsals();

      if (!isActive) {
        return;
      }

      if (error) {
        setMessage(error.message);
        setRehearsals([]);
      } else {
        setRehearsals(data);
      }

      setIsLoading(false);
    }

    void loadInitialRehearsals();

    return () => {
      isActive = false;
    };
  }, [fetchRehearsals]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    if (!form.date) {
      setMessage("Date is required.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const { error } = await supabase.from("rehearsals").insert({
      date: form.date,
      note: form.note.trim() || null,
    });

    if (error) {
      setMessage(getRehearsalErrorMessage(error.message));
    } else {
      setForm(emptyForm);
      await loadRehearsals();
    }

    setIsSaving(false);
  }

  return (
    <section className="max-w-6xl">
      <div>
        <p className="text-sm font-medium text-zinc-500">Rehearsals</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Rehearsal schedule
        </h1>
      </div>

      {!isSupabaseConfigured ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold">All rehearsals</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {isLoading ? (
              <p className="px-4 py-6 text-sm text-zinc-500">
                Loading rehearsals...
              </p>
            ) : rehearsals.length > 0 ? (
              rehearsals.map((rehearsal) => (
                <Link
                  key={rehearsal.id}
                  href={`/rehearsals/${rehearsal.id}`}
                  className="block px-4 py-4 transition hover:bg-zinc-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-950">
                        {formatDate(rehearsal.date)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                        {rehearsal.note || "No note added."}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-zinc-500">
                      Open
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-zinc-500">
                No rehearsals yet.
              </p>
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-md border border-zinc-200 bg-white p-5"
        >
          <h2 className="text-base font-semibold">Create rehearsal</h2>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Date</span>
              <input
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
                type="date"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Note</span>
              <textarea
                value={form.note}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                className="mt-1 min-h-28 w-full resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
                placeholder="Optional rehearsal note"
              />
            </label>
          </div>

          {message ? (
            <p className="mt-4 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving || !isSupabaseConfigured}
            className="mt-5 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSaving ? "Creating..." : "Create"}
          </button>
        </form>
      </div>
    </section>
  );
}
