alter table public.attendance enable row level security;

grant select, insert, update on public.attendance to anon, authenticated;

drop policy if exists "Allow attendance select" on public.attendance;
create policy "Allow attendance select"
  on public.attendance
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow attendance insert" on public.attendance;
create policy "Allow attendance insert"
  on public.attendance
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow attendance update" on public.attendance;
create policy "Allow attendance update"
  on public.attendance
  for update
  to anon, authenticated
  using (true)
  with check (true);
