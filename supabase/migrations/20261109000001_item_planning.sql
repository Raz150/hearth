-- When an item is planned, whose it is, and who finished it.

alter table public.list_items
  add column planned_for date,
  add column assigned_to uuid references public.household_members (user_id),
  add column completed_by uuid references public.household_members (user_id),
  add column completed_at timestamptz;

-- Runs as the caller, so RLS hides members of any other household from the check.
-- completed_* are set here, and not granted to clients, so credit can't be forged.
create function private.list_item_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.assigned_to is not null and not exists
    (select 1 from public.household_members where user_id = new.assigned_to) then
    raise exception 'assignee is not in this household';
  end if;
  if tg_op = 'UPDATE' and new.checked is distinct from old.checked then
    new.completed_by := case when new.checked then auth.uid() end;
    new.completed_at := case when new.checked then now() end;
  end if;
  return new;
end $$;
grant execute on function private.list_item_before_write() to authenticated;

create trigger list_item_before_write before insert or update on public.list_items
  for each row execute function private.list_item_before_write();

grant insert (planned_for, assigned_to), update (planned_for, assigned_to)
  on public.list_items to authenticated;
