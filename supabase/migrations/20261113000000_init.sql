-- Hearth schema: one household, two members, everything shared inside the household.
-- Every table has RLS; every policy is "row belongs to my household".

-- ── Helper ────────────────────────────────────────────────────────────────
-- Lives in a non-exposed schema so it can't be called through the REST API.
create schema if not exists private;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  ink text not null default '#6f94c8' check (ink ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now()
);

-- security definer: reads members without recursing through members' own RLS policy.
create function private.my_household_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select household_id from public.members where user_id = (select auth.uid()) $$;

revoke all on function private.my_household_id() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.my_household_id() to authenticated;

-- ── Tables ────────────────────────────────────────────────────────────────
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  due_date date,
  assignee uuid references public.members (user_id) on delete set null,
  done_by uuid references public.members (user_id) on delete set null,
  done_at timestamptz,
  created_by uuid not null default auth.uid() references public.members (user_id),
  created_at timestamptz not null default now(),
  check ((done_by is null) = (done_at is null))
);

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  every_days int not null check (every_days between 1 and 365),
  next_due date not null,
  last_by uuid references public.members (user_id) on delete set null,
  last_on date,
  created_at timestamptz not null default now()
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  amount_sen int not null check (amount_sen between 0 and 100000000), -- up to RM 1,000,000
  due_day int not null check (due_day between 1 and 31),              -- 31 = last day in short months
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, household_id) -- target for the composite FK below
);

create table public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id(),
  bill_id uuid not null,
  month date not null check (extract(day from month) = 1), -- first day of the month paid for
  paid_by uuid not null default auth.uid() references public.members (user_id),
  paid_on date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,
  unique (bill_id, month),
  -- payment must be for a bill in the same household
  foreign key (bill_id, household_id) references public.bills (id, household_id) on delete cascade
);

-- One sticky note per household.
create table public.notes (
  household_id uuid primary key default private.my_household_id() references public.households (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 140),
  written_by uuid not null default auth.uid() references public.members (user_id),
  written_at timestamptz not null default now()
);

-- "What we did" log; also feeds the weekly chore tally. Append-only.
create table public.activity (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  kind text not null check (kind in ('todo', 'chore', 'bill', 'note')),
  body text not null check (char_length(body) between 1 and 240),
  done_by uuid not null default auth.uid() references public.members (user_id),
  done_at timestamptz not null default now()
);
create index activity_household_time on public.activity (household_id, done_at desc);

-- ── Row-level security ────────────────────────────────────────────────────
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.todos enable row level security;
alter table public.chores enable row level security;
alter table public.bills enable row level security;
alter table public.bill_payments enable row level security;
alter table public.notes enable row level security;
alter table public.activity enable row level security;

-- Belt and braces: the anon (logged-out) role gets nothing at all.
revoke all on all tables in schema public from anon;

-- households / members: read-only from the app; created by the seed script.
create policy "read my household" on public.households
  for select to authenticated using (id = (select private.my_household_id()));

create policy "read my household's members" on public.members
  for select to authenticated using (household_id = (select private.my_household_id()));

-- Each person may edit only their own name and ink (column grants limit which fields).
create policy "edit myself" on public.members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and household_id = (select private.my_household_id()));
revoke insert, update, delete on public.members from authenticated;
grant update (display_name, ink) on public.members to authenticated;
revoke insert, update, delete on public.households from authenticated;

-- Shared tables: full access to rows in my household.
create policy "household rows" on public.todos for all to authenticated
  using (household_id = (select private.my_household_id())) with check (household_id = (select private.my_household_id()));
create policy "household rows" on public.chores for all to authenticated
  using (household_id = (select private.my_household_id())) with check (household_id = (select private.my_household_id()));
create policy "household rows" on public.bills for all to authenticated
  using (household_id = (select private.my_household_id())) with check (household_id = (select private.my_household_id()));
create policy "household rows" on public.bill_payments for all to authenticated
  using (household_id = (select private.my_household_id())) with check (household_id = (select private.my_household_id()));
create policy "household rows" on public.notes for all to authenticated
  using (household_id = (select private.my_household_id())) with check (household_id = (select private.my_household_id()));

-- Activity: read the household's log, add entries only as yourself, never edit or delete.
create policy "read household activity" on public.activity for select to authenticated
  using (household_id = (select private.my_household_id()));
create policy "log as myself" on public.activity for insert to authenticated
  with check (household_id = (select private.my_household_id()) and done_by = (select auth.uid()));
revoke update, delete on public.activity from authenticated;

-- ── Realtime ──────────────────────────────────────────────────────────────
-- Realtime checks each subscriber against the select policies above before sending a change.
alter publication supabase_realtime add table
  public.members, public.todos, public.chores, public.bills, public.bill_payments, public.notes, public.activity;

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
