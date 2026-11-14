-- Important dates: an event can repeat every year (birthdays, anniversary) and be starred as important.
-- A yearly event's own date is the first time it happened (e.g. the wedding day), so the app can say "3 years".
alter table public.events
  add column yearly boolean not null default false,
  add column important boolean not null default false;

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
