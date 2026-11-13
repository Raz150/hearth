-- Each of us keeps a different ink, so ticks, names and stamps always say who did what.
alter table public.members add constraint members_ink_per_household unique (household_id, ink);

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
