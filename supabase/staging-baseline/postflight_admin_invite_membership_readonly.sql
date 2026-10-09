-- Read-only verification for the staging admin invitation membership grant.
-- Run only in el-town-staging, Project ID zghcorbdtslrjtkkspfe.

SELECT
  (SELECT count(*) FROM pg_catalog.pg_policy AS p
   WHERE p.polrelid = 'public.neighborhood_admins'::regclass
     AND p.polname = 'staging_admin_own_active_membership') AS expected_policy_count,
  (SELECT count(*) FROM pg_catalog.pg_policy AS p
   WHERE p.polrelid = 'public.neighborhood_admins'::regclass) AS admin_policy_count,
  pg_catalog.has_column_privilege('authenticated', 'public.neighborhood_admins', 'id', 'SELECT') AS member_id_read,
  pg_catalog.has_column_privilege('authenticated', 'public.neighborhood_admins', 'neighborhood_id', 'SELECT') AS member_town_read,
  pg_catalog.has_column_privilege('authenticated', 'public.neighborhood_admins', 'admin_auth_id', 'SELECT') AS member_auth_id_read,
  pg_catalog.has_column_privilege('authenticated', 'public.neighborhood_admins', 'status', 'SELECT') AS member_status_read,
  pg_catalog.has_column_privilege('authenticated', 'public.neighborhood_admins', 'admin_invite_token', 'SELECT') AS token_read,
  pg_catalog.has_table_privilege('anon', 'public.neighborhood_admins', 'SELECT') AS anon_read,
  pg_catalog.has_table_privilege('authenticated', 'public.neighborhood_admins', 'INSERT') AS client_insert,
  pg_catalog.has_table_privilege('authenticated', 'public.neighborhood_admins', 'UPDATE') AS client_update,
  pg_catalog.has_table_privilege('authenticated', 'public.neighborhood_admins', 'DELETE') AS client_delete,
  pg_catalog.has_table_privilege('service_role', 'public.neighborhood_admins', 'UPDATE') AS server_update;
