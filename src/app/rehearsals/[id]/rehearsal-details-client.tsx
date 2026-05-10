"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type AttendanceStatus = "present" | "absent" | "late";

type Rehearsal = {
  id: string;
  date: string;
  note: string | null;
};

type Member = {
  id: string;
  name: string;
  voice_part: string | null;
};

type AttendanceRecord = {
  member_id: string;
  status: AttendanceStatus;
};

type DetailsResult = {
  rehearsal: Rehearsal | null;
  members: Member[];
  attendance: Record<string, AttendanceStatus>;
  error: string | null;
};

const attendanceStatuses: AttendanceStatus[] = ["present", "absent", "late"];

const attendanceLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function getAttendanceErrorMessage(errorMessage: string) {
  if (errorMessage.includes("row-level security policy")) {
    return [
      "Supabase is blocking attendance writes with row-level security.",
      "Run supabase/fix-current-rls.sql in the Supabase SQL Editor, then try again.",
    ].join(" ");
  }

  return errorMessage;
}

export default function RehearsalDetailsClient({
  rehearsalId,
}: {
  rehearsalId: string;
}) {
  const [rehearsal, setRehearsal] = useState<Rehearsal | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchDetails = useCallback(async (): Promise<DetailsResult> => {
    if (!supabase) {
      return {
        rehearsal: null,
        members: [],
        attendance: {},
        error: null,
      };
    }

    const [rehearsalResult, membersResult, attendanceResult] =
      await Promise.all([
      supabase
        .from("rehearsals")
        .select("id, date, note")
        .eq("id", rehearsalId)
        .single(),
      supabase
        .from("members")
        .select("id, name, voice_part")
        .order("name", { ascending: true }),
      supabase
        .from("attendance")
        .select("member_id, status")
        .eq("rehearsal_id", rehearsalId),
      ]);

    if (rehearsalResult.error) {
      return {
        rehearsal: null,
        members: [],
        attendance: {},
        error: rehearsalResult.error.message,
      };
    }

    if (membersResult.error) {
      return {
        rehearsal: rehearsalResult.data as Rehearsal,
        members: [],
        attendance: {},
        error: membersResult.error.message,
      };
    }

    if (attendanceResult.error) {
      return {
        rehearsal: rehearsalResult.data as Rehearsal,
        members: [],
        attendance: {},
        error: attendanceResult.error.message,
      };
    }

    const loadedMembers = (membersResult.data ?? []) as Member[];
    const loadedAttendance = (attendanceResult.data ?? []) as AttendanceRecord[];
    const nextAttendance = loadedMembers.reduce<Record<string, AttendanceStatus>>(
      (current, member) => {
        const record = loadedAttendance.find(
          (item) => item.member_id === member.id,
        );

        current[member.id] = record?.status ?? "absent";
        return current;
      },
      {},
    );

    return {
      rehearsal: rehearsalResult.data as Rehearsal,
      members: loadedMembers,
      attendance: nextAttendance,
      error: null,
    };
  }, [rehearsalId]);

  useEffect(() => {
    let isActive = true;

    async function loadInitialDetails() {
      const result = await fetchDetails();

      if (!isActive) {
        return;
      }

      setRehearsal(result.rehearsal);
      setMembers(result.members);
      setAttendance(result.attendance);
      setMessage(result.error);
      setIsLoading(false);
    }

    void loadInitialDetails();

    return () => {
      isActive = false;
    };
  }, [fetchDetails]);

  async function saveAttendance() {
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const rows = members.map((member) => ({
      member_id: member.id,
      rehearsal_id: rehearsalId,
      status: attendance[member.id] ?? "absent",
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "member_id,rehearsal_id" });

    if (error) {
      setMessage(getAttendanceErrorMessage(error.message));
    } else {
      setMessage("Attendance saved.");
    }

    setIsSaving(false);
  }

  const membersByStatus = attendanceStatuses.reduce<
    Record<AttendanceStatus, Member[]>
  >(
    (current, status) => {
      current[status] = members.filter(
        (member) => (attendance[member.id] ?? "absent") === status,
      );
      return current;
    },
    {
      present: [],
      absent: [],
      late: [],
    },
  );

  return (
    <section className="max-w-4xl">
      <Link
        href="/rehearsals"
        className="text-sm font-medium text-zinc-600 hover:text-zinc-950"
      >
        Back to rehearsals
      </Link>

      {!isSupabaseConfigured ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
        </div>
      ) : null}

      <div className="mt-6 rounded-md border border-zinc-200 bg-white p-6">
        <p className="text-sm font-medium text-zinc-500">Rehearsal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {rehearsal ? formatDate(rehearsal.date) : "Rehearsal details"}
        </h1>
        {isLoading ? (
          <p className="mt-5 text-zinc-600">Loading rehearsal...</p>
        ) : (
          <p className="mt-5 whitespace-pre-wrap text-zinc-700">
            {rehearsal?.note || "No note added."}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-md border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold">Attendance</h2>
          <button
            type="button"
            onClick={saveAttendance}
            disabled={isSaving || isLoading || members.length === 0}
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="divide-y divide-zinc-100">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-zinc-500">
              Loading members...
            </p>
          ) : members.length > 0 ? (
            members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-zinc-950">{member.name}</p>
                  <p className="text-sm capitalize text-zinc-500">
                    {member.voice_part ?? "No voice part"}
                  </p>
                </div>
                <select
                  value={attendance[member.id] ?? "absent"}
                  onChange={(event) =>
                    setAttendance((current) => ({
                      ...current,
                      [member.id]: event.target.value as AttendanceStatus,
                    }))
                  }
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm capitalize outline-none transition focus:border-zinc-500 sm:w-36"
                >
                  {attendanceStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-zinc-500">
              No members found.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {attendanceStatuses.map((status) => (
          <section
            key={status}
            className="rounded-md border border-zinc-200 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">
                {attendanceLabels[status]}
              </h2>
              <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">
                {membersByStatus[status].length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {isLoading ? (
                <p className="text-sm text-zinc-500">Loading...</p>
              ) : membersByStatus[status].length > 0 ? (
                membersByStatus[status].map((member) => (
                  <p key={member.id} className="text-sm text-zinc-700">
                    {member.name}
                  </p>
                ))
              ) : (
                <p className="text-sm text-zinc-500">No members.</p>
              )}
            </div>
          </section>
        ))}
      </div>

      {message ? (
        <p className="mt-4 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
