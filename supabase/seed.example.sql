-- Links the two auth users to one household. Copy, replace the two emails, run once in the SQL editor
-- (after creating both users under Authentication > Users).
with h as (
  insert into public.households (name) values ('Our home') returning id
)
insert into public.members (user_id, household_id, display_name, ink)
select u.id, h.id, v.display_name, v.ink
from h
cross join (values
  ('you@example.com',  'Raz',  '#6f94c8'),
  ('wife@example.com', 'Wife', '#e0849f')
) as v (email, display_name, ink)
join auth.users u on lower(u.email) = lower(v.email);

-- Check: should return 2 rows.
select display_name, ink from public.members;
