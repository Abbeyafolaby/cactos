create extension if not exists "pgcrypto";

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  voice_part text,
  birthday_day integer check (birthday_day between 1 and 31),
  birthday_month integer check (birthday_month between 1 and 12),
  created_at timestamptz not null default now()
);

alter table public.members enable row level security;

revoke all on public.members from anon;
grant select, insert, update on public.members to authenticated;

drop policy if exists "Allow members select" on public.members;
create policy "Allow members select"
  on public.members
  for select
  to authenticated
  using (true);

drop policy if exists "Allow members insert" on public.members;
create policy "Allow members insert"
  on public.members
  for insert
  to authenticated
  with check (true);

drop policy if exists "Allow members update" on public.members;
create policy "Allow members update"
  on public.members
  for update
  to authenticated
  using (true)
  with check (true);

create table if not exists public.rehearsals (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  note text
);

alter table public.rehearsals enable row level security;

revoke all on public.rehearsals from anon;
grant select, insert on public.rehearsals to authenticated;

drop policy if exists "Allow rehearsals select" on public.rehearsals;
create policy "Allow rehearsals select"
  on public.rehearsals
  for select
  to authenticated
  using (true);

drop policy if exists "Allow rehearsals insert" on public.rehearsals;
create policy "Allow rehearsals insert"
  on public.rehearsals
  for insert
  to authenticated
  with check (true);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  rehearsal_id uuid not null references public.rehearsals(id) on delete cascade,
  status text not null,
  unique (member_id, rehearsal_id)
);

alter table public.attendance enable row level security;

revoke all on public.attendance from anon;
grant select, insert, update on public.attendance to authenticated;

drop policy if exists "Allow attendance select" on public.attendance;
create policy "Allow attendance select"
  on public.attendance
  for select
  to authenticated
  using (true);

drop policy if exists "Allow attendance insert" on public.attendance;
create policy "Allow attendance insert"
  on public.attendance
  for insert
  to authenticated
  with check (true);

drop policy if exists "Allow attendance update" on public.attendance;
create policy "Allow attendance update"
  on public.attendance
  for update
  to authenticated
  using (true)
  with check (true);
