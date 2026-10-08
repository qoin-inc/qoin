-- Read-only preflight for the el-town-staging Supabase SQL Editor.
-- First verify the dashboard project name and Project ID: zghcorbdtslrjtkkspfe.
-- This SQL cannot identify the Supabase Project ID by itself.
-- Do not run the baseline unless public_tables = 0 and auth_users = 0.
-- Even then, review the result and the project identity before any write.

SELECT
  current_database() AS database_name,
  current_user AS database_role,
  (SELECT count(*) FROM pg_catalog.pg_class AS c
   JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) AS public_tables,
  (SELECT count(*) FROM auth.users) AS auth_users,
  to_regclass('public.neighborhood_admins') IS NOT NULL AS app_schema_present;
