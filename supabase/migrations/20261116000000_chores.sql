-- Chores go live: an optional owner, same-day undo from either phone, and "thanks" in the log.

alter table public.chores
  -- Who looks after it; null = either of us.
  add column owner uuid references public.members (user_id) on delete set null,
  -- State before the last tick, so un-ticking today restores it exactly (whichever phone does it).
  add column prev_next_due date,
  add column prev_last_by uuid references public.members (user_id) on delete set null,
  add column prev_last_on date;

-- "Raz thanked Aisha for Laundry" lines in the shared log.
alter table public.activity drop constraint activity_kind_check;
alter table public.activity add constraint activity_kind_check check (kind in ('todo', 'chore', 'bill', 'note', 'thanks'));

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
