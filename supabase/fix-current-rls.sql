alter table public.members enable row level security;
alter table public.rehearsals enable row level security;
alter table public.attendance enable row level security;

revoke all on public.members from anon;
revoke all on public.rehearsals from anon;
revoke all on public.attendance from anon;

grant select, insert, update on public.members to authenticated;
grant select, insert on public.rehearsals to authenticated;
grant select, insert, update on public.attendance to authenticated;

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
