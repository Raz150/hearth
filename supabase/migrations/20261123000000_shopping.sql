-- Shopping list. One row per thing we buy, kept forever, so the app can suggest it again ("buy again").
--   on the list, got_by null  → still to buy
--   on the list, got_by set   → in the trolley
--   off the list              → history (times = how often we've bought it, got_at = last time)
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  qty text check (char_length(qty) <= 20),
  aisle text not null default 'other'
    check (aisle in ('produce', 'meat', 'dairy', 'bakery', 'pantry', 'frozen', 'drinks', 'snacks', 'household', 'care', 'other')),
  on_list boolean not null default true,
  added_by uuid default auth.uid() references public.members (user_id) on delete set null,
  got_by uuid references public.members (user_id) on delete set null,
  got_at timestamptz,
  times integer not null default 0 check (times between 0 and 100000),
  created_at timestamptz not null default now(),
  check (got_by is null or on_list)
);
-- "Milk" and " milk" are the same item.
create unique index shopping_items_name on public.shopping_items (household_id, lower(btrim(name)));

alter table public.shopping_items enable row level security;
create policy "household rows" on public.shopping_items for all to authenticated
  using (household_id = (select private.my_household_id())) with check (household_id = (select private.my_household_id()));

-- "Done shopping": everything in the trolley goes back to history in one step (both phones may be ticking at once).
-- security invoker, so the policy above still limits it to our household.
create function public.finish_shopping() returns integer language sql security invoker set search_path = '' as $$
  with done as (
    update public.shopping_items set on_list = false, got_by = null, times = times + 1
    where on_list and got_by is not null
    returning 1
  )
  select count(*)::integer from done;
$$;
revoke all on function public.finish_shopping() from public, anon;
grant execute on function public.finish_shopping() to authenticated;

-- "Raz finished shopping (12 items)" in the shared log.
alter table public.activity drop constraint activity_kind_check;
alter table public.activity add constraint activity_kind_check check (kind in ('todo', 'chore', 'bill', 'note', 'thanks', 'doa', 'shop'));

-- Realtime checks the policy above before sending a change.
alter publication supabase_realtime add table public.shopping_items;

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
