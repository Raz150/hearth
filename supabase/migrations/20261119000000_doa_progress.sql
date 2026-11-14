-- Doa tab, take two: learn and memorise authentic doa together. "Doakan saya" is gone (its requests are deleted),
-- and each of us keeps a learning / memorised mark per doa, which the other can see.
-- Old "prayed for" lines in the activity log stay; the 'doa' kind is reused for "memorised" lines.

drop table if exists public.doa_prayers;
drop table if exists public.doa_requests;

create table public.doa_progress (
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  -- an id from lib/doa.json: Hisnul Muslim "hm101" or Quran "q2:201" / "q20:25-28"
  doa_id text not null check (doa_id ~ '^(hm[0-9]{1,3}|q[0-9]{1,3}:[0-9]{1,3}(-[0-9]{1,3})?)$'),
  status text not null check (status in ('learning', 'memorised')),
  updated_at timestamptz not null default now(),
  primary key (user_id, doa_id)
);

alter table public.doa_progress enable row level security;

-- Both of us see both marks; each writes only their own.
create policy "read household doa progress" on public.doa_progress for select to authenticated
  using (household_id = (select private.my_household_id()));
create policy "add my own doa progress" on public.doa_progress for insert to authenticated
  with check (household_id = (select private.my_household_id()) and user_id = (select auth.uid()));
create policy "change my own doa progress" on public.doa_progress for update to authenticated
  using (household_id = (select private.my_household_id()) and user_id = (select auth.uid()))
  with check (household_id = (select private.my_household_id()) and user_id = (select auth.uid()));
create policy "clear my own doa progress" on public.doa_progress for delete to authenticated
  using (household_id = (select private.my_household_id()) and user_id = (select auth.uid()));

-- Realtime checks each subscriber against the select policy above before sending a change.
alter publication supabase_realtime add table public.doa_progress;

notify pgrst, 'reload schema';
