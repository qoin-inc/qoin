-- Read-only verification after the schema-only staging baseline.
-- Run only in el-town-staging (Project ID zghcorbdtslrjtkkspfe).

SELECT
  (SELECT count(*) FROM pg_catalog.pg_class AS c
   JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) AS public_tables,
  (SELECT count(*) FROM pg_catalog.pg_proc AS p
   JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public') AS public_functions,
  (SELECT count(*) FROM pg_catalog.pg_policy AS p
   JOIN pg_catalog.pg_class AS c ON c.oid = p.polrelid
   JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public') AS public_policies,
  (SELECT count(*) FROM pg_catalog.pg_class AS c
   JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity) AS rls_tables,
  (SELECT count(*) FROM auth.users) AS auth_users,
  has_table_privilege('anon', 'public.neighborhood_admins', 'SELECT') AS anon_admin_read,
  has_table_privilege('authenticated', 'public.neighborhood_admins', 'SELECT') AS authenticated_admin_read,
  has_table_privilege('service_role', 'public.neighborhood_admins', 'UPDATE') AS service_admin_update;
