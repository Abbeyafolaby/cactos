"use client";

import { useCallback, useEffect, useState } from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

type DashboardStats = {
  totalMembers: number;
  totalRehearsals: number;
  lastRehearsalAttendance: number;
  lastRehearsalDate: string | null;
};

type BirthdayMember = {
  id: string;
  name: string;
  birthday_day: number | null;
  birthday_month: number | null;
};

type DashboardData = {
  stats: DashboardStats;
  todaysBirthdays: BirthdayMember[];
  upcomingBirthdays: BirthdayMember[];
};

const emptyStats: DashboardStats = {
  totalMembers: 0,
  totalRehearsals: 0,
  lastRehearsalAttendance: 0,
  lastRehearsalDate: null,
};

const emptyDashboardData: DashboardData = {
  stats: emptyStats,
  todaysBirthdays: [],
  upcomingBirthdays: [],
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatBirthday(member: BirthdayMember) {
  if (!member.birthday_day || !member.birthday_month) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(2024, member.birthday_month - 1, member.birthday_day));
}

function getBirthdayDateForYear(member: BirthdayMember, year: number) {
  if (!member.birthday_day || !member.birthday_month) {
    return null;
  }

  const date = new Date(
    year,
    member.birthday_month - 1,
    member.birthday_day,
  );

  if (
    date.getMonth() !== member.birthday_month - 1 ||
    date.getDate() !== member.birthday_day
  ) {
    return null;
  }

  return date;
}

function getDaysUntilBirthday(member: BirthdayMember, today: Date) {
  const thisYearBirthday = getBirthdayDateForYear(
    member,
    today.getFullYear(),
  );

  if (!thisYearBirthday) {
    return null;
  }

  const nextBirthday =
    thisYearBirthday < today
      ? getBirthdayDateForYear(member, today.getFullYear() + 1)
      : thisYearBirthday;

  if (!nextBirthday) {
    return null;
  }

  return Math.round(
    (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function getBirthdayLists(members: BirthdayMember[]) {
  const currentDate = new Date();
  const today = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );

  const membersWithDaysUntilBirthday = members
    .map((member) => ({
      member,
      daysUntilBirthday: getDaysUntilBirthday(member, today),
    }))
    .filter(
      (
        item,
      ): item is {
        member: BirthdayMember;
        daysUntilBirthday: number;
      } => item.daysUntilBirthday !== null,
    );

  const todaysBirthdays = membersWithDaysUntilBirthday
    .filter((item) => item.daysUntilBirthday === 0)
    .map((item) => item.member)
    .sort((firstMember, secondMember) =>
      firstMember.name.localeCompare(secondMember.name),
    );

  const upcomingBirthdays = membersWithDaysUntilBirthday
    .filter(
      (item) => item.daysUntilBirthday > 0 && item.daysUntilBirthday <= 7,
    )
    .sort((firstItem, secondItem) => {
      if (firstItem.daysUntilBirthday !== secondItem.daysUntilBirthday) {
        return firstItem.daysUntilBirthday - secondItem.daysUntilBirthday;
      }

      return firstItem.member.name.localeCompare(secondItem.member.name);
    })
    .map((item) => item.member);

  return { todaysBirthdays, upcomingBirthdays };
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [todaysBirthdays, setTodaysBirthdays] = useState<BirthdayMember[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<BirthdayMember[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!supabase) {
      return { data: emptyDashboardData, error: null };
    }

    const [
      membersResult,
      rehearsalsResult,
      lastRehearsalResult,
      birthdayMembersResult,
    ] =
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
        supabase
          .from("members")
          .select("id, name, birthday_day, birthday_month")
          .not("birthday_day", "is", null)
          .not("birthday_month", "is", null),
      ]);

    if (membersResult.error) {
      return { data: emptyDashboardData, error: membersResult.error.message };
    }

    if (rehearsalsResult.error) {
      return { data: emptyDashboardData, error: rehearsalsResult.error.message };
    }

    if (lastRehearsalResult.error) {
      return {
        data: emptyDashboardData,
        error: lastRehearsalResult.error.message,
      };
    }

    if (birthdayMembersResult.error) {
      return {
        data: emptyDashboardData,
        error: birthdayMembersResult.error.message,
      };
    }

    let lastRehearsalAttendance = 0;

    if (lastRehearsalResult.data) {
      const attendanceResult = await supabase
        .from("attendance")
        .select("id", { count: "exact", head: true })
        .eq("rehearsal_id", lastRehearsalResult.data.id)
        .eq("status", "present");

      if (attendanceResult.error) {
        return {
          data: emptyDashboardData,
          error: attendanceResult.error.message,
        };
      }

      lastRehearsalAttendance = attendanceResult.count ?? 0;
    }

    const { todaysBirthdays, upcomingBirthdays } = getBirthdayLists(
      (birthdayMembersResult.data ?? []) as BirthdayMember[],
    );

    return {
      data: {
        stats: {
          totalMembers: membersResult.count ?? 0,
          totalRehearsals: rehearsalsResult.count ?? 0,
          lastRehearsalAttendance,
          lastRehearsalDate: lastRehearsalResult.data?.date ?? null,
        },
        todaysBirthdays,
        upcomingBirthdays,
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

      setStats(result.data.stats);
      setTodaysBirthdays(result.data.todaysBirthdays);
      setUpcomingBirthdays(result.data.upcomingBirthdays);
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

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold">Today</h2>
          <div className="mt-4">
            {isLoading ? (
              <p className="text-sm text-zinc-500">Loading birthdays...</p>
            ) : todaysBirthdays.length > 0 ? (
              <ul className="divide-y divide-zinc-100">
                {todaysBirthdays.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <span className="font-medium text-zinc-950">
                      {member.name}
                    </span>
                    <span className="text-zinc-500">
                      {formatBirthday(member)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">No birthdays today.</p>
            )}
          </div>
        </div>

        <div className="rounded-md border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold">Upcoming birthdays</h2>
          <div className="mt-4">
            {isLoading ? (
              <p className="text-sm text-zinc-500">Loading birthdays...</p>
            ) : upcomingBirthdays.length > 0 ? (
              <ul className="divide-y divide-zinc-100">
                {upcomingBirthdays.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-4 py-3 text-sm"
                  >
                    <span className="font-medium text-zinc-950">
                      {member.name}
                    </span>
                    <span className="text-zinc-500">
                      {formatBirthday(member)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">
                No birthdays in the next 7 days.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
