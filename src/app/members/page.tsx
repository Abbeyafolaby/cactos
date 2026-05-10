"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type VoicePart = "soprano" | "alto" | "tenor" | "bass";

type Member = {
  id: string;
  name: string;
  voice_part: VoicePart | null;
  birthday_day: number | null;
  birthday_month: number | null;
};

type MemberForm = {
  name: string;
  voice_part: VoicePart;
  birthday_day: string;
  birthday_month: string;
};

const voiceParts: VoicePart[] = ["soprano", "alto", "tenor", "bass"];

const days = Array.from({ length: 31 }, (_, index) => (index + 1).toString());

const months = [
  { name: "January", value: "1" },
  { name: "February", value: "2" },
  { name: "March", value: "3" },
  { name: "April", value: "4" },
  { name: "May", value: "5" },
  { name: "June", value: "6" },
  { name: "July", value: "7" },
  { name: "August", value: "8" },
  { name: "September", value: "9" },
  { name: "October", value: "10" },
  { name: "November", value: "11" },
  { name: "December", value: "12" },
];

const emptyForm: MemberForm = {
  name: "",
  voice_part: "soprano",
  birthday_day: "",
  birthday_month: "",
};

function formatBirthday(member: Member) {
  if (!member.birthday_day || !member.birthday_month) {
    return "-";
  }

  const month = months.find(
    (item) => item.value === member.birthday_month?.toString(),
  );

  return `${month?.name ?? member.birthday_month} ${member.birthday_day}`;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [form, setForm] = useState<MemberForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!supabase) {
      return { data: [] as Member[], error: null };
    }

    const { data, error } = await supabase
      .from("members")
      .select("id, name, voice_part, birthday_day, birthday_month")
      .order("name", { ascending: true });

    return { data: (data ?? []) as Member[], error };
  }, []);

  async function loadMembers() {
    setIsLoading(true);
    setMessage(null);

    const { data, error } = await fetchMembers();

    if (error) {
      setMessage(error.message);
      setMembers([]);
    } else {
      setMembers(data);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    let isActive = true;

    async function loadInitialMembers() {
      const { data, error } = await fetchMembers();

      if (!isActive) {
        return;
      }

      if (error) {
        setMessage(error.message);
        setMembers([]);
      } else {
        setMembers(data);
      }

      setIsLoading(false);
    }

    void loadInitialMembers();

    return () => {
      isActive = false;
    };
  }, [fetchMembers]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(member: Member) {
    setEditingId(member.id);
    setForm({
      name: member.name,
      voice_part: member.voice_part ?? "soprano",
      birthday_day: member.birthday_day?.toString() ?? "",
      birthday_month: member.birthday_month?.toString() ?? "",
    });
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    const birthdayDay = form.birthday_day ? Number(form.birthday_day) : null;
    const birthdayMonth = form.birthday_month
      ? Number(form.birthday_month)
      : null;

    const payload = {
      name: form.name.trim(),
      voice_part: form.voice_part,
      birthday_day: birthdayDay,
      birthday_month: birthdayMonth,
    };

    if (!payload.name) {
      setMessage("Name is required.");
      return;
    }

    if (
      (birthdayDay === null) !== (birthdayMonth === null) ||
      (birthdayDay !== null && (birthdayDay < 1 || birthdayDay > 31)) ||
      (birthdayMonth !== null && (birthdayMonth < 1 || birthdayMonth > 12))
    ) {
      setMessage("Enter a valid birthday day and month, or leave both blank.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const { error } = editingId
      ? await supabase.from("members").update(payload).eq("id", editingId)
      : await supabase.from("members").insert(payload);

    if (error) {
      setMessage(error.message);
    } else {
      resetForm();
      await loadMembers();
    }

    setIsSaving(false);
  }

  return (
    <section className="max-w-6xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">Members</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Member list
          </h1>
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Add `NEXT_PUBLIC_SUPABASE_URL` and
          `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Voice part</th>
                <th className="px-4 py-3">Birthday</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={4}>
                    Loading members...
                  </td>
                </tr>
              ) : members.length > 0 ? (
                members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 font-medium text-zinc-950">
                      <Link
                        href={`/members/${member.id}`}
                        className="hover:text-zinc-600"
                      >
                        {member.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-zinc-600">
                      {member.voice_part ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {formatBirthday(member)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => startEditing(member)}
                        className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-zinc-500" colSpan={4}>
                    No members yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-md border border-zinc-200 bg-white p-5"
        >
          <h2 className="text-base font-semibold">
            {editingId ? "Edit member" : "Add member"}
          </h2>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">Name</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-zinc-500"
                type="text"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Voice part
              </span>
              <select
                value={form.voice_part}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    voice_part: event.target.value as VoicePart,
                  }))
                }
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm capitalize outline-none transition focus:border-zinc-500"
              >
                {voiceParts.map((voicePart) => (
                  <option key={voicePart} value={voicePart}>
                    {voicePart}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span className="text-sm font-medium text-zinc-700">
                Birthday
              </span>
              <div className="mt-1 flex overflow-hidden rounded-md border border-zinc-300 bg-white transition focus-within:border-zinc-500">
                <label className="min-w-20 shrink-0">
                  <span className="sr-only">Birthday day</span>
                  <select
                    value={form.birthday_day}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        birthday_day: event.target.value,
                      }))
                    }
                    className="h-10 w-full border-0 bg-transparent px-3 text-sm outline-none"
                  >
                    <option value="">Day</option>
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="my-2 w-px bg-zinc-200" />
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Birthday month</span>
                  <select
                    value={form.birthday_month}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        birthday_month: event.target.value,
                      }))
                    }
                    className="h-10 w-full border-0 bg-transparent px-3 text-sm outline-none"
                  >
                    <option value="">Month</option>
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          {message ? (
            <p className="mt-4 rounded-md bg-zinc-100 p-3 text-sm text-zinc-700">
              {message}
            </p>
          ) : null}

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={isSaving || !isSupabaseConfigured}
              className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              {isSaving ? "Saving..." : editingId ? "Save changes" : "Add"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
