-- Bills tab scrapped. The app only ever used in-memory sample bills, so these tables should be empty.
drop table if exists public.bill_payments;
drop table if exists public.bills;

delete from public.activity where kind = 'bill';
alter table public.activity drop constraint activity_kind_check;
alter table public.activity add constraint activity_kind_check check (kind in ('todo', 'chore', 'note', 'thanks', 'doa'));
