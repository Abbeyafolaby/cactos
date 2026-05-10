alter table public.members enable row level security;

grant select, insert, update on public.members to anon, authenticated;

drop policy if exists "Allow members select" on public.members;
create policy "Allow members select"
  on public.members
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow members insert" on public.members;
create policy "Allow members insert"
  on public.members
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow members update" on public.members;
create policy "Allow members update"
  on public.members
  for update
  to anon, authenticated
  using (true)
  with check (true);
