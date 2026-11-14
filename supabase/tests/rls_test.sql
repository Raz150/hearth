-- Local check only (never run against the real project): see README "Testing RLS".
\set ON_ERROR_STOP on
-- Two households: A (a1, a2 = us) and B (b1 = an outsider) to prove isolation.
insert into auth.users values
  ('00000000-0000-0000-0000-0000000000a1', 'a1@x.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'a2@x.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'b1@x.com');
insert into public.households (id, name) values
  ('00000000-0000-0000-0000-00000000000a', 'A'), ('00000000-0000-0000-0000-00000000000b', 'B');
insert into public.members (user_id, household_id, display_name, ink) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'Raz', '#6f94c8'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000a', 'Wife', '#e0849f'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'Outsider', '#7fa36b');

create function pg_temp.expect_fail(sql text, label text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAIL (was allowed): %', label;
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  raise notice 'ok  %  (%)', label, sqlerrm;
end $$;
create function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', label; end if;
  raise notice 'ok  %', label;
end $$;

-- ── as a1 ──
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
insert into public.todos (title) values ('Buy eggs');
insert into public.notes (body) values ('hello');
insert into public.activity (kind, body) values ('todo', 'ticked off Buy eggs');
select pg_temp.expect((select household_id from public.todos limit 1) = '00000000-0000-0000-0000-00000000000a', 'household_id filled in by default');
select pg_temp.expect((select count(*) from public.members) = 2, 'a1 sees only own 2 members');
select pg_temp.expect((select count(*) from public.households) = 1, 'a1 sees only own household');
update public.members set ink = '#7fa36b' where user_id = '00000000-0000-0000-0000-0000000000a1';
select pg_temp.expect((select ink from public.members where user_id = '00000000-0000-0000-0000-0000000000a1') = '#7fa36b', 'a1 can change own ink');
update public.members set display_name = 'hacked' where user_id = '00000000-0000-0000-0000-0000000000a2';
select pg_temp.expect((select display_name from public.members where user_id = '00000000-0000-0000-0000-0000000000a2') = 'Wife', 'a1 cannot rename a2');
select pg_temp.expect_fail($$update public.members set household_id = '00000000-0000-0000-0000-00000000000b' where user_id = '00000000-0000-0000-0000-0000000000a1'$$, 'a1 cannot move household');
select pg_temp.expect_fail($$insert into public.members (user_id, household_id, display_name) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a', 'x')$$, 'a1 cannot add members');
select pg_temp.expect_fail($$update public.members set ink = 'red' where user_id = '00000000-0000-0000-0000-0000000000a1'$$, 'ink must be a hex colour');
select pg_temp.expect_fail($$update public.members set ink = '#e0849f' where user_id = '00000000-0000-0000-0000-0000000000a1'$$, 'cannot take spouse''s ink');
select pg_temp.expect_fail($$insert into public.activity (kind, body, done_by) values ('todo', 'x', '00000000-0000-0000-0000-0000000000a2')$$, 'cannot log as spouse');
select pg_temp.expect_fail($$update public.activity set body = 'edited'$$, 'activity cannot be edited');
select pg_temp.expect_fail($$insert into public.todos (title) values ('   ')$$, 'blank title rejected');
select pg_temp.expect_fail($$insert into public.todos (title, done_by) values ('x', '00000000-0000-0000-0000-0000000000a1')$$, 'done_by without done_at rejected');
insert into public.todos (id, title, priority, tags) values ('00000000-0000-0000-0000-0000000000e1', 'Groceries', 2, '{shop,weekly}');
insert into public.todo_steps (todo_id, title) values ('00000000-0000-0000-0000-0000000000e1', 'Eggs');
select pg_temp.expect_fail($$insert into public.todos (title, priority) values ('x', 4)$$, 'priority 4 rejected');
select pg_temp.expect_fail($$insert into public.todos (title, tags) values ('x', '{Shop}')$$, 'uppercase tag rejected');
select pg_temp.expect_fail($$insert into public.todos (title, tags) values ('x', '{a,a}')$$, 'repeated tag rejected');
select pg_temp.expect_fail($$insert into public.todos (title, tags) values ('x', '{a,b,c,d,e,f}')$$, 'sixth tag rejected');
select pg_temp.expect_fail($$insert into public.todo_steps (todo_id, title) values ('00000000-0000-0000-0000-0000000000e1', ' ')$$, 'blank step rejected');
insert into public.chores (title, every_days, next_due, owner) values ('Laundry', 3, '2026-11-14', '00000000-0000-0000-0000-0000000000a2');
select pg_temp.expect_fail($$insert into public.chores (title, every_days, next_due) values (' ', 3, '2026-11-14')$$, 'blank chore rejected');
select pg_temp.expect_fail($$insert into public.chores (title, every_days, next_due) values ('x', 0, '2026-11-14')$$, 'every_days 0 rejected');
insert into public.activity (kind, body) values ('thanks', 'thanked Wife for Laundry');
select pg_temp.expect_fail($$insert into public.activity (kind, body) values ('hug', 'x')$$, 'unknown log kind rejected');
insert into public.activity (kind, body) values ('doa', 'asked for doa');
insert into public.doa_progress (doa_id, status) values ('hm101', 'learning');
select pg_temp.expect_fail($$insert into public.doa_progress (doa_id, status) values ('hm75; drop', 'learning')$$, 'unknown doa id rejected');
select pg_temp.expect_fail($$insert into public.doa_progress (doa_id, status) values ('hm102', 'done')$$, 'unknown doa status rejected');
select pg_temp.expect_fail($$insert into public.doa_progress (doa_id, status, user_id) values ('hm102', 'learning', '00000000-0000-0000-0000-0000000000a2')$$, 'cannot mark doa progress as spouse');
insert into public.shifts (member, day, label, starts, ends) values ('00000000-0000-0000-0000-0000000000a2', '2026-12-01', 'Night', '21:30', '07:30');
select pg_temp.expect_fail($$insert into public.shifts (member, day, label, starts, ends) values ('00000000-0000-0000-0000-0000000000a2', '2026-12-01', 'Office', '08:00', '17:00')$$, 'one shift per person per day');
select pg_temp.expect_fail($$insert into public.shifts (member, day, label, starts, ends) values ('00000000-0000-0000-0000-0000000000a2', '2026-12-02', 'x', '08:00', '08:00')$$, 'zero-length shift rejected');
insert into public.events (title, starts_on, ends_on) values ('Trip', '2026-12-12', '2026-12-15');
select pg_temp.expect_fail($$insert into public.events (title, starts_on, ends_on) values ('x', '2026-12-12', '2026-12-11')$$, 'event ending before it starts rejected');
select pg_temp.expect_fail($$insert into public.todos (title, due_time) values ('x', '23:59')$$, 'due time without a date rejected');
reset role;

-- ── as a2 (spouse): sees everything a1 made ──
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select pg_temp.expect((select count(*) from public.todos) = 2 and (select count(*) from public.todo_steps) = 1 and (select count(*) from public.activity) = 3, 'a2 sees shared rows');
update public.chores set last_by = auth.uid(), last_on = '2026-11-14', next_due = '2026-11-17', prev_next_due = next_due;
select pg_temp.expect((select last_by from public.chores) = '00000000-0000-0000-0000-0000000000a2', 'a2 can tick a1''s chore');
update public.todos set done_by = auth.uid(), done_at = now() where title = 'Buy eggs';
select pg_temp.expect((select done_by from public.todos where title = 'Buy eggs') = '00000000-0000-0000-0000-0000000000a2', 'a2 can tick a1''s todo');
update public.todo_steps set done = true;
select pg_temp.expect((select done from public.todo_steps), 'a2 can tick a1''s step');
delete from public.activity;
select pg_temp.expect((select count(*) from public.activity) = 3, 'a2 cannot delete a1''s log line');
select pg_temp.expect((select count(*) from public.doa_progress) = 1, 'a2 sees a1''s doa progress');
select pg_temp.expect((select count(*) from public.shifts) = 1 and (select count(*) from public.events) = 1, 'a2 sees shifts and plans');
update public.doa_progress set status = 'memorised';
delete from public.doa_progress;
select pg_temp.expect((select status from public.doa_progress where user_id = '00000000-0000-0000-0000-0000000000a1') = 'learning', 'a2 cannot change or clear a1''s doa progress');
insert into public.doa_progress (doa_id, status) values ('hm101', 'memorised');
select pg_temp.expect((select count(*) from public.doa_progress) = 2, 'a2 can mark own doa progress');
reset role;

-- ── as b1 (outsider) ──
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b1';
select pg_temp.expect((select count(*) from public.todos) + (select count(*) from public.todo_steps) = 0, 'b1 sees no todos or steps of A');
update public.todo_steps set title = 'pwned';
select pg_temp.expect_fail($$insert into public.todo_steps (todo_id, title) values ('00000000-0000-0000-0000-0000000000e1', 'spam')$$, 'b1 cannot add a step to A''s todo');
select pg_temp.expect((select count(*) from public.members) = 1, 'b1 sees only self');
select pg_temp.expect((select count(*) from public.notes) + (select count(*) from public.activity) + (select count(*) from public.chores) = 0, 'b1 sees nothing else of A');
select pg_temp.expect((select count(*) from public.doa_progress) = 0, 'b1 sees none of A''s doa progress');
select pg_temp.expect((select count(*) from public.shifts) + (select count(*) from public.events) = 0, 'b1 sees no shifts or plans of A');
insert into public.shifts (member, day, label, starts, ends) values ('00000000-0000-0000-0000-0000000000a2', '2026-12-01', 'Spam', '08:00', '09:00'); -- lands in B, doesn't block A's day
update public.events set title = 'pwned';
select pg_temp.expect_fail($$insert into public.doa_progress (doa_id, status, household_id) values ('hm101', 'learning', '00000000-0000-0000-0000-00000000000a')$$, 'b1 cannot add doa progress into A');
update public.doa_progress set status = 'memorised';
update public.todos set title = 'pwned';
update public.chores set title = 'pwned';
select pg_temp.expect_fail($$insert into public.todos (household_id, title) values ('00000000-0000-0000-0000-00000000000a', 'spam')$$, 'b1 cannot insert into A');
reset role;
select pg_temp.expect((select count(*) from public.todos where title = 'pwned') + (select count(*) from public.todo_steps where title = 'pwned') + (select count(*) from public.chores where title = 'pwned') + (select count(*) from public.events where title = 'pwned') = 0, 'b1 updates had no effect');

-- ── a1 removes own log line (undo), memorises and clears own doa ──
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
delete from public.activity;
select pg_temp.expect((select count(*) from public.activity) = 0, 'a1 can delete own log line');
select pg_temp.expect((select status from public.doa_progress where user_id = '00000000-0000-0000-0000-0000000000a1') = 'learning', 'b1 update had no effect on doa progress');
update public.doa_progress set status = 'memorised' where user_id = auth.uid();
select pg_temp.expect((select status from public.doa_progress where user_id = '00000000-0000-0000-0000-0000000000a1') = 'memorised', 'a1 can mark own doa memorised');
delete from public.doa_progress;
select pg_temp.expect((select count(*) from public.doa_progress) = 1, 'a1 clears only own doa progress');
reset role;

-- ── logged out ──
set role anon;
select pg_temp.expect_fail($$select * from public.todos$$, 'anon cannot read todos');
select pg_temp.expect_fail($$select * from public.members$$, 'anon cannot read members');
select pg_temp.expect_fail($$select private.my_household_id()$$, 'anon cannot call helper');
reset role;

select pg_temp.expect((select count(*) from pg_publication_tables where pubname = 'supabase_realtime') = 9, 'realtime publishes 9 tables');
select pg_temp.expect((select bool_and(rowsecurity) from pg_tables where schemaname = 'public'), 'RLS on every public table');
delete from public.todos where title = 'Groceries';
select pg_temp.expect((select count(*) from public.todo_steps) = 0, 'deleting a todo deletes its steps');
\echo ALL RLS TESTS PASSED
