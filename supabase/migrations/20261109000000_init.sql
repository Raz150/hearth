-- Hearth v1: household foundation and shared lists.

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.household_members (
  -- Primary key on user_id: a user belongs to exactly one household.
  user_id uuid primary key references auth.users (id),
  household_id uuid not null references public.households (id),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50)
);

create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- security definer so the household_members policy doesn't recurse into itself.
create function private.my_household_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select household_id from public.household_members where user_id = auth.uid()
$$;
revoke all on function private.my_household_id() from public;
grant execute on function private.my_household_id() to authenticated;

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id()
    references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  created_at timestamptz not null default now()
);
create index on public.lists (household_id);

create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 500),
  note text check (char_length(note) <= 500),
  checked boolean not null default false,
  added_by uuid not null default auth.uid() references public.household_members (user_id),
  created_at timestamptz not null default now()
);
create index on public.list_items (list_id);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

create policy "members read their household" on public.households
  for select to authenticated using (id = (select private.my_household_id()));

create policy "members read their household's members" on public.household_members
  for select to authenticated using (household_id = (select private.my_household_id()));

create policy "members manage their lists" on public.lists
  for all to authenticated
  using (household_id = (select private.my_household_id()))
  with check (household_id = (select private.my_household_id()));

-- The subquery on lists is itself filtered by the lists policy.
create policy "members manage their list items" on public.list_items
  for all to authenticated
  using (list_id in (select id from public.lists))
  with check (list_id in (select id from public.lists));

-- Supabase grants everything on public tables by default; narrow it.
-- Columns left out (household_id, added_by, ...) can't be set or changed by clients.
revoke all on public.households, public.household_members, public.lists, public.list_items
  from anon, authenticated;
grant select on public.households, public.household_members to authenticated;
grant select, delete on public.lists, public.list_items to authenticated;
grant insert (name), update (name) on public.lists to authenticated;
grant insert (list_id, text, note), update (text, note, checked) on public.list_items to authenticated;

alter publication supabase_realtime add table public.lists, public.list_items;
