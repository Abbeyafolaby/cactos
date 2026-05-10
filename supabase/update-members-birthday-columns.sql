alter table public.members
  drop column if exists birthday,
  add column if not exists birthday_day integer check (birthday_day between 1 and 31),
  add column if not exists birthday_month integer check (birthday_month between 1 and 12);
