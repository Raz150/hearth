-- Calendar: work shifts, our plans and trips, and a time on to-dos (deadlines).
-- Everything is KL local date + time (one household, one timezone), like todos.due_date.

-- One shift per person per day. A night shift ends the next morning (ends < starts).
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  member uuid not null references public.members (user_id) on delete cascade,
  day date not null,
  label text not null check (char_length(btrim(label)) between 1 and 20),
  starts time not null,
  ends time not null check (ends <> starts),
  -- household in the key: another household can't block our day by naming one of us
  unique (household_id, member, day)
);

-- Plans, trips, appointments. One day or a range of days; optional start time (null = all day).
create table public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  starts_on date not null,
  ends_on date not null,
  at time,
  member uuid references public.members (user_id) on delete set null, -- null = both of us
  note text check (char_length(note) <= 500),
  created_by uuid not null default auth.uid() references public.members (user_id),
  created_at timestamptz not null default now(),
  check (ends_on between starts_on and starts_on + 90)
);
create index events_household_end on public.events (household_id, ends_on);

-- Deadlines: a to-do can be due at a time ("by 11:59 PM"), only if it has a date.
alter table public.todos
  add column due_time time,
  add constraint todos_due_time_needs_date check (due_time is null or due_date is not null);

-- ── Row-level security: rows of my household only ──
alter table public.shifts enable row level security;
alter table public.events enable row level security;
create policy "household rows" on public.shifts for all to authenticated
  using (household_id = (select private.my_household_id())) with check (household_id = (select private.my_household_id()));
create policy "household rows" on public.events for all to authenticated
  using (household_id = (select private.my_household_id())) with check (household_id = (select private.my_household_id()));

-- Realtime checks the policies above before sending a change.
alter publication supabase_realtime add table public.shifts, public.events;

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
