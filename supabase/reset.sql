-- ONE-TIME: wipes every table from the old version of the app. Run once in the SQL editor,
-- then run migrations/20261113000000_init.sql. Auth users are NOT touched.
drop schema if exists private cascade;
drop schema if exists public cascade;
create schema public;

-- Restore Supabase's default grants on the fresh public schema.
grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
