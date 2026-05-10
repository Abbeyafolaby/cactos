"use client";

import { useCallback, useEffect, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type DashboardStats = {
  totalMembers: number;
  totalRehearsals: number;
  lastRehearsalAttendance: number;
  lastRehearsalDate: string | null;
};

const emptyStats: DashboardStats = {
  totalMembers: 0,
  totalRehearsals: 0,
  lastRehearsalAttendance: 0,
  lastRehearsalDate: null,
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!supabase) {
      return { stats: emptyStats, error: null };
    }

    const [membersResult, rehearsalsResult, lastRehearsalResult] =
      await Promise.all([
        supabase.from("members").select("id", {
          count: "exact",
          head: true,
        }),
        supabase.from("rehearsals").select("id", {
          count: "exact",
          head: true,
        }),
        supabase
          .from("rehearsals")
          .select("id, date")
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (membersResult.error) {
      return { stats: emptyStats, error: membersResult.error.message };
    }

    if (rehearsalsResult.error) {
      return { stats: emptyStats, error: rehearsalsResult.error.message };
    }

    if (lastRehearsalResult.error) {
      return { stats: emptyStats, error: lastRehearsalResult.error.message };
    }

    let lastRehearsalAttendance = 0;

    if (lastRehearsalResult.data) {
      const attendanceResult = await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("rehearsal_id", lastRehearsalResult.data.id)
        .eq("status", "present");

      if (attendanceResult.error) {
        return { stats: emptyStats, error: attendanceResult.error.message };
      }

      lastRehearsalAttendance = attendanceResult.count ?? 0;
    }

    return {
      stats: {
        totalMembers: membersResult.count ?? 0,
        totalRehearsals: rehearsalsResult.count ?? 0,
        lastRehearsalAttendance,
        lastRehearsalDate: lastRehearsalResult.data?.date ?? null,
      },
      error: null,
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadStats() {
      const result = await fetchStats();

      if (!isActive) {
        return;
      }

      setStats(result.stats);
      setMessage(result.error);
      setIsLoading(false);
    }

    void loadStats();

    return () => {
      isActive = false;
    };
  }, [fetchStats]);

  const cards = [
    {
      label: "Total members",
      value: stats.totalMembers,
      detail: "People in the choir",
    },
    {
      label: "Total rehearsals",
      value: stats.totalRehearsals,
      detail: "Sessions created",
    },
    {
      label: "Last rehearsal attendance",
      value: stats.lastRehearsalAttendance,
      detail: stats.lastRehearsalDate
        ? formatDate(stats.lastRehearsalDate)
        : "No rehearsal yet",
    },
  ];

  return (
    <section className="max-w-6xl">
      <div>
        <p className="text-sm font-medium text-zinc-500">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Overview
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

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-md border border-zinc-200 bg-white p-5"
          >
            <p className="text-sm font-medium text-zinc-500">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {isLoading ? "-" : card.value}
            </p>
            <p className="mt-2 text-sm text-zinc-600">{card.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
