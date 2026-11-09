-- Run once in the Supabase SQL Editor after creating both users.
-- Replace the emails and names here in the editor; don't commit real emails.
with new_household as (
  insert into public.households (name) values ('Home') returning id
)
insert into public.household_members (user_id, household_id, display_name)
select u.id, h.id, m.display_name
from (values
  ('first@example.com', 'First name'),
  ('second@example.com', 'Second name')
) as m (email, display_name)
join auth.users u on u.email = m.email
cross join new_household h;
-- Must report INSERT 0 2. Fewer means an email didn't match.
