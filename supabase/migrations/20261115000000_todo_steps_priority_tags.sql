-- To-dos get a priority (0 none … 3 high), up to 5 tags, and subtasks ("steps").

-- Tags: lowercase word starting with a letter, max 20 chars, max 5, no repeats.
create function private.valid_tags(tags text[]) returns boolean
language sql immutable set search_path = ''
as $$
  select cardinality(tags) <= 5
     and cardinality(tags) = (select count(distinct t) from unnest(tags) t)
     and coalesce((select bool_and(t ~ '^[a-z][a-z0-9-]{0,19}$') from unnest(tags) t), true)
$$;
grant execute on function private.valid_tags(text[]) to authenticated;

alter table public.todos
  add column priority smallint not null default 0 check (priority between 0 and 3),
  add column tags text[] not null default '{}' check (private.valid_tags(tags)),
  add constraint todos_id_household unique (id, household_id); -- target for the composite FK below

create table public.todo_steps (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null default private.my_household_id(),
  todo_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  -- a step must belong to a to-do in the same household; deleting the to-do deletes its steps
  foreign key (todo_id, household_id) references public.todos (id, household_id) on delete cascade
);
create index todo_steps_todo on public.todo_steps (todo_id, created_at);

alter table public.todo_steps enable row level security;
create policy "household rows" on public.todo_steps for all to authenticated
  using (household_id = (select private.my_household_id())) with check (household_id = (select private.my_household_id()));

alter publication supabase_realtime add table public.todo_steps;

-- Tell the Supabase API (PostgREST) to pick up the changes now.
notify pgrst, 'reload schema';
