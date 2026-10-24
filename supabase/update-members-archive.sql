-- Run once in the Supabase SQL Editor for an existing database.
-- NULL means active. Archiving preserves member details and attendance history.
alter table public.members
  add column if not exists archived_at timestamptz;
