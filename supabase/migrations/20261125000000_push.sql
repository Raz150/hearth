-- Push notifications. Each phone that turns notifications on stores its Web Push subscription here.
-- The database itself calls our Vercel route (/api/push) when something worth a ping happens, so a ping
-- goes out even if the sender's app closes right after saving, and nobody can send fake pings by calling the route.
--
-- Before this does anything, store two secrets in Supabase Vault (SQL editor, once):
--   select vault.create_secret('https://<app>.vercel.app/api/push', 'push_url');
--   select vault.create_secret('<same value as PUSH_WEBHOOK_SECRET in Vercel>', 'push_secret');
-- Without them the triggers quietly do nothing.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id() references public.households (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.members (user_id) on delete cascade,
  endpoint text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
-- Only my own phones. My partner can't read my endpoint; the server reads both with the secret key.
create policy "my subscriptions" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()) and household_id = (select private.my_household_id()))
  with check (user_id = (select auth.uid()) and household_id = (select private.my_household_id()));
-- Not in the realtime publication: nothing on screen shows it.

-- When an item last went onto the list (new, or "buy again" from history). Lets the server collapse
-- "added Milk", "added Eggs"... into one ping.
alter table public.shopping_items add column listed_at timestamptz not null default now();

create function private.stamp_listed() returns trigger language plpgsql set search_path = '' as $$
begin
  new.listed_at := now();
  return new;
end $$;
create trigger stamp_listed before update of on_list on public.shopping_items
  for each row when (new.on_list and not old.on_list) execute function private.stamp_listed();

-- ── Ping the server ─────────────────────────────────────────────────────────
create extension if not exists pg_net with schema extensions;

-- security definer: reads the Vault secrets, which the app's users can't.
-- net.http_post is async (queued, sent after commit), so a slow or down server never blocks a save.
create function private.push_ping() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  url text := (select decrypted_secret from vault.decrypted_secrets where name = 'push_url');
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'push_secret');
  sender uuid := (select auth.uid());
begin
  -- No secrets yet, or a change made from the dashboard (no logged-in sender): nothing to send.
  if url is null or secret is null or sender is null then return null; end if;
  perform net.http_post(
    url := url,
    body := jsonb_build_object('table', tg_table_name, 'by', sender, 'record', to_jsonb(new)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || secret)
  );
  return null;
end $$;
revoke all on function private.push_ping() from public, anon, authenticated;

-- Only the events worth a ping reach the server; ticking things off stays silent.
-- got_by is null: undoing "Done shopping" puts trolley items back, which is not "added".
create trigger push_activity after insert on public.activity
  for each row when (new.kind in ('note', 'thanks', 'shop')) execute function private.push_ping();
create trigger push_item_new after insert on public.shopping_items
  for each row when (new.on_list and new.got_by is null) execute function private.push_ping();
create trigger push_item_again after update of on_list on public.shopping_items
  for each row when (new.on_list and not old.on_list and new.got_by is null) execute function private.push_ping();
create trigger push_todo_new after insert on public.todos
  for each row when (new.assignee is not null) execute function private.push_ping();
create trigger push_todo_assigned after update of assignee on public.todos
  for each row when (new.assignee is not null and new.assignee is distinct from old.assignee) execute function private.push_ping();

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
