create extension if not exists "pgcrypto";

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  organization_id uuid not null,
  date date not null,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  category text,
  amount numeric not null check (amount >= 0),
  description text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.transactions
  add column if not exists category text;

alter table public.transactions enable row level security;

revoke all on public.transactions from anon;
grant select, insert, update on public.transactions to authenticated;

drop policy if exists "Allow transactions select" on public.transactions;
create policy "Allow transactions select"
  on public.transactions
  for select
  to authenticated
  using (true);

drop policy if exists "Allow transactions insert" on public.transactions;
create policy "Allow transactions insert"
  on public.transactions
  for insert
  to authenticated
  with check (true);

drop policy if exists "Allow transactions update" on public.transactions;
create policy "Allow transactions update"
  on public.transactions
  for update
  to authenticated
  using (true)
  with check (true);

notify pgrst, 'reload schema';
