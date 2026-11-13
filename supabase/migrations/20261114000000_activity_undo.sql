-- Undo needs to remove the log line it created ("ticked off X").
-- People may delete only their own entries; editing stays impossible.
grant delete on public.activity to authenticated;
create policy "remove my own entries" on public.activity for delete to authenticated
  using (household_id = (select private.my_household_id()) and done_by = (select auth.uid()));

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
