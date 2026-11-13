-- "Doakan saya": one of us asks for doa, the other taps "I prayed for you" (once a day), and the asker can
-- later mark it answered. The doa library itself is static (lib/doa.json), so it needs no table.

create table public.doa_requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  asked_by uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 200),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  unique (id, household_id) -- target for the composite FK below
);
create index doa_requests_household_time on public.doa_requests (household_id, created_at desc);

create table public.doa_prayers (
  request_id uuid not null,
  household_id uuid not null default private.my_household_id(),
  prayed_by uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,
  prayed_at timestamptz not null default now(),
  primary key (request_id, prayed_by, day),
  -- a prayer must be for a request in the same household
  foreign key (request_id, household_id) references public.doa_requests (id, household_id) on delete cascade
);

alter table public.doa_requests enable row level security;
alter table public.doa_prayers enable row level security;

-- Requests: both of us read; each adds, marks answered or deletes only their own.
create policy "read household doa requests" on public.doa_requests for select to authenticated
  using (household_id = (select private.my_household_id()));
create policy "add my own doa request" on public.doa_requests for insert to authenticated
  with check (household_id = (select private.my_household_id()) and asked_by = (select auth.uid()));
create policy "answer my own doa request" on public.doa_requests for update to authenticated
  using (household_id = (select private.my_household_id()) and asked_by = (select auth.uid()))
  with check (household_id = (select private.my_household_id()) and asked_by = (select auth.uid()));
create policy "delete my own doa request" on public.doa_requests for delete to authenticated
  using (household_id = (select private.my_household_id()) and asked_by = (select auth.uid()));
-- Only the "answered" mark can change; the words stay as they were asked.
revoke update on public.doa_requests from authenticated;
grant update (answered_at) on public.doa_requests to authenticated;

-- Prayers: both of us read; I add one only as myself, for today, on my spouse's request (not my own),
-- and can take back only today's (undo). Never edited.
create policy "read household doa prayers" on public.doa_prayers for select to authenticated
  using (household_id = (select private.my_household_id()));
create policy "pray for my spouse today" on public.doa_prayers for insert to authenticated
  with check (
    household_id = (select private.my_household_id())
    and prayed_by = (select auth.uid())
    and day = (now() at time zone 'Asia/Kuala_Lumpur')::date
    and not exists (select 1 from public.doa_requests r where r.id = request_id and r.asked_by = (select auth.uid()))
  );
create policy "undo my prayer today" on public.doa_prayers for delete to authenticated
  using (
    household_id = (select private.my_household_id())
    and prayed_by = (select auth.uid())
    and day = (now() at time zone 'Asia/Kuala_Lumpur')::date
  );
revoke update on public.doa_prayers from authenticated;

-- "Raz prayed for Aisha" in the shared log.
alter table public.activity drop constraint activity_kind_check;
alter table public.activity add constraint activity_kind_check check (kind in ('todo', 'chore', 'bill', 'note', 'thanks', 'doa'));

-- Realtime checks each subscriber against the select policies above before sending a change.
alter publication supabase_realtime add table public.doa_requests, public.doa_prayers;

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
