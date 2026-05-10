"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type AttendanceStatus = "present" | "absent" | "late";

type Member = {
  id: string;
  name: string;
  voice_part: string | null;
};

type AttendanceHistoryRow = {
  id: string;
  status: AttendanceStatus;
  rehearsals: {
    id: string;
    date: string;
    note: string | null;
  } | null;
};

type RawAttendanceHistoryRow = {
  id: string;
  status: AttendanceStatus;
  rehearsals:
    | {
        id: string;
        date: string;
        note: string | null;
      }
    | {
        id: string;
        date: string;
        note: string | null;
      }[]
    | null;
};

type DetailsResult = {
  member: Member | null;
  history: AttendanceHistoryRow[];
  error: string | null;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export default function MemberDetailsClient({ memberId }: { memberId: string }) {
  const [member, setMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<AttendanceHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchDetails = useCallback(async (): Promise<DetailsResult> => {
    if (!supabase) {
      return {
        member: null,
        history: [],
        error: null,
      };
    }

    const [memberResult, historyResult] = await Promise.all([
      supabase
        .from("members")
        .select("id, name, voice_part")
        .eq("id", memberId)
        .single(),
      supabase
        .from("attendance")
        .select("id, status, rehearsals(id, date, note)")
        .eq("member_id", memberId),
    ]);

    if (memberResult.error) {
      return {
        member: null,
        history: [],
        error: memberResult.error.message,
      };
    }

    if (historyResult.error) {
      return {
        member: memberResult.data as Member,
        history: [],
        error: historyResult.error.message,
      };
    }

    const history = ((historyResult.data ?? []) as RawAttendanceHistoryRow[])
      .map((record) => ({
        ...record,
        rehearsals: Array.isArray(record.rehearsals)
          ? (record.rehearsals[0] ?? null)
          : record.rehearsals,
      }))
      .sort(
        (first, second) =>
          (second.rehearsals?.date ?? "").localeCompare(
            first.rehearsals?.date ?? "",
          ),
      );

    return {
      member: memberResult.data as Member,
      history,
      error: null,
    };
  }, [memberId]);

  useEffect(() => {
    let isActive = true;

    async function loadInitialDetails() {
      const result = await fetchDetails();

      if (!isActive) {
        return;
      }

      setMember(result.member);
      setHistory(result.history);
      setMessage(result.error);
      setIsLoading(false);
    }

    void loadInitialDetails();

    return () => {
      isActive = false;
    };
  }, [fetchDetails]);

  return (
    <section className="max-w-4xl">
      <Link
        href="/members"
        className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
      >
        Back to members
      </Link>

      {!isSupabaseConfigured ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
        </div>
      ) : null}

      <div className="mt-6 rounded-md border border-zinc-200 bg-white p-6">
        <p className="text-sm font-medium text-zinc-500">Member</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {member?.name ?? "Member details"}
        </h1>
        <p className="mt-3 text-sm capitalize text-zinc-600">
          {member?.voice_part ?? "No voice part"}
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-md border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold">Attendance history</h2>
        </div>

        <div className="divide-y divide-zinc-100">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-zinc-500">
              Loading attendance...
            </p>
          ) : history.length > 0 ? (
            history.map((record) => (
              <div
                key={record.id}
                className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-zinc-950">
                    {record.rehearsals
                      ? formatDate(record.rehearsals.date)
                      : "Unknown rehearsal"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                    {record.rehearsals?.note || "No note added."}
                  </p>
                </div>
                <span className="w-fit rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium capitalize text-zinc-700">
                  {record.status}
                </span>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-zinc-500">
              No attendance records yet.
            </p>
          )}
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
