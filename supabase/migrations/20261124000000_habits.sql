-- Habits, built the way the research says works:
--   "After I <cue>, I will <action>" (implementation intention), a weekly target instead of a daily streak
--   (built-in slack), honest self-logging that the other can see, and an automaticity check-in every
--   two weeks so a habit can "graduate" once it runs on its own.

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  owner uuid references public.members (user_id) on delete cascade, -- null = a habit we do together
  cue text not null check (char_length(btrim(cue)) between 1 and 80),
  action text not null check (char_length(btrim(action)) between 1 and 80),
  per_week smallint not null default 7 check (per_week between 1 and 7),
  graduated_on date,
  created_by uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (id, household_id) -- target for the composite FKs below
);

-- One row = "I did it that day".
create table public.habit_checks (
  habit_id uuid not null,
  household_id uuid not null default private.my_household_id(),
  member uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,
  primary key (habit_id, member, day),
  foreign key (habit_id, household_id) references public.habits (id, household_id) on delete cascade
);

-- "How automatic does this feel?" 1 = I have to push myself, 5 = I just do it.
create table public.habit_ratings (
  habit_id uuid not null,
  household_id uuid not null default private.my_household_id(),
  member uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,
  score smallint not null check (score between 1 and 5),
  primary key (habit_id, member, day),
  foreign key (habit_id, household_id) references public.habits (id, household_id) on delete cascade
);

alter table public.habits enable row level security;
alter table public.habit_checks enable row level security;
alter table public.habit_ratings enable row level security;
-- Belt and braces, as in init: the logged-out role gets nothing (new tables otherwise inherit Supabase's default grants).
revoke all on public.habits, public.habit_checks, public.habit_ratings from anon;

-- Habits: both of us read and edit; a new one is mine or ours, never set up on the other's behalf.
create policy "read household habits" on public.habits for select to authenticated
  using (household_id = (select private.my_household_id()));
create policy "add my own or a shared habit" on public.habits for insert to authenticated
  with check (
    household_id = (select private.my_household_id())
    and created_by = (select auth.uid())
    and (owner is null or owner = (select auth.uid()))
  );
create policy "edit household habits" on public.habits for update to authenticated
  using (household_id = (select private.my_household_id())) with check (household_id = (select private.my_household_id()));
create policy "delete household habits" on public.habits for delete to authenticated
  using (household_id = (select private.my_household_id()));
-- Whose habit it is never changes (the history belongs to that person).
revoke update on public.habits from authenticated;
grant update (cue, action, per_week, graduated_on) on public.habits to authenticated;

-- Checks: both of us read; each ticks only for themselves, on their own or a shared habit,
-- for today or up to 6 days back (forgot to tick last night). Never edited.
create policy "read household habit checks" on public.habit_checks for select to authenticated
  using (household_id = (select private.my_household_id()));
create policy "tick my own habit" on public.habit_checks for insert to authenticated
  with check (
    household_id = (select private.my_household_id())
    and member = (select auth.uid())
    and day between (now() at time zone 'Asia/Kuala_Lumpur')::date - 6 and (now() at time zone 'Asia/Kuala_Lumpur')::date
    and exists (select 1 from public.habits h where h.id = habit_id and (h.owner is null or h.owner = (select auth.uid())))
  );
create policy "untick my own habit" on public.habit_checks for delete to authenticated
  using (household_id = (select private.my_household_id()) and member = (select auth.uid()));
revoke update on public.habit_checks from authenticated;

-- Ratings: both of us read; each rates only for themselves, today (re-rating today replaces it).
create policy "read household habit ratings" on public.habit_ratings for select to authenticated
  using (household_id = (select private.my_household_id()));
create policy "rate my own habit" on public.habit_ratings for insert to authenticated
  with check (
    household_id = (select private.my_household_id())
    and member = (select auth.uid())
    and day = (now() at time zone 'Asia/Kuala_Lumpur')::date
    and exists (select 1 from public.habits h where h.id = habit_id and (h.owner is null or h.owner = (select auth.uid())))
  );
create policy "re-rate my own habit today" on public.habit_ratings for update to authenticated
  using (household_id = (select private.my_household_id()) and member = (select auth.uid()) and day = (now() at time zone 'Asia/Kuala_Lumpur')::date)
  with check (household_id = (select private.my_household_id()) and member = (select auth.uid()) and day = (now() at time zone 'Asia/Kuala_Lumpur')::date);
revoke delete on public.habit_ratings from authenticated;

-- "Aisha hit her goal for Read one page", "Raz cheered Aisha on", "graduated a habit" in the shared log.
alter table public.activity drop constraint activity_kind_check;
alter table public.activity add constraint activity_kind_check check (kind in ('todo', 'chore', 'bill', 'note', 'thanks', 'doa', 'shop', 'habit'));

-- Realtime checks each subscriber against the select policies above before sending a change.
alter publication supabase_realtime add table public.habits, public.habit_checks, public.habit_ratings;

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
