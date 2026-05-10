alter table public.rehearsals enable row level security;

grant select, insert on public.rehearsals to anon, authenticated;

drop policy if exists "Allow rehearsals select" on public.rehearsals;
create policy "Allow rehearsals select"
  on public.rehearsals
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Allow rehearsals insert" on public.rehearsals;
create policy "Allow rehearsals insert"
  on public.rehearsals
  for insert
  to anon, authenticated
  with check (true);
