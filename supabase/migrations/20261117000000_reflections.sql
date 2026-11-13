-- One line each per day on the daily ayah/hadith: "what I'll take from it". Both of us read both; each writes only their own.

create table public.reflections (
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,
  written_by uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 200),
  written_at timestamptz not null default now(),
  primary key (household_id, day, written_by)
);

alter table public.reflections enable row level security;

create policy "read household reflections" on public.reflections for select to authenticated
  using (household_id = (select private.my_household_id()));
-- Write or clear only my own line, and only for today (KL), so past days can't be rewritten.
create policy "write my own reflection today" on public.reflections for all to authenticated
  using (household_id = (select private.my_household_id()) and written_by = (select auth.uid()))
  with check (
    household_id = (select private.my_household_id())
    and written_by = (select auth.uid())
    and day = (now() at time zone 'Asia/Kuala_Lumpur')::date
  );

-- "Raz reflected on today's reminder" in the shared log.
alter table public.activity drop constraint activity_kind_check;
alter table public.activity add constraint activity_kind_check check (kind in ('todo', 'chore', 'bill', 'note', 'thanks', 'reflection'));

-- Realtime checks each subscriber against the select policy above before sending a change.
alter publication supabase_realtime add table public.reflections;

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
