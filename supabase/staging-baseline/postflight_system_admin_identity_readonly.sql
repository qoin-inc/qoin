-- Read only; run only in el-town-staging, Project ID zghcorbdtslrjtkkspfe.
SELECT
  pg_catalog.to_regclass('el_town_staging_private.system_admin_identity') IS NOT NULL AS identity_table_present,
  (SELECT c.relrowsecurity FROM pg_catalog.pg_class AS c
   WHERE c.oid = 'el_town_staging_private.system_admin_identity'::regclass) AS identity_rls_enabled,
  pg_catalog.has_schema_privilege('anon', 'el_town_staging_private', 'USAGE') AS anon_schema_usage,
  pg_catalog.has_schema_privilege('authenticated', 'el_town_staging_private', 'USAGE') AS client_schema_usage,
  pg_catalog.has_table_privilege('anon', 'el_town_staging_private.system_admin_identity', 'SELECT') AS anon_identity_read,
  pg_catalog.has_table_privilege('authenticated', 'el_town_staging_private.system_admin_identity', 'SELECT') AS client_identity_read,
  (SELECT count(*) FROM el_town_staging_private.system_admin_identity) AS configured_admins,
  pg_catalog.has_function_privilege('anon', 'public.is_el_town_system_admin()', 'EXECUTE') AS anon_function_execute,
  pg_catalog.has_function_privilege('authenticated', 'public.is_el_town_system_admin()', 'EXECUTE') AS client_function_execute,
  pg_catalog.has_function_privilege('authenticated', 'public.el_town_actor_is_system_admin()', 'EXECUTE') AS client_actor_function_execute;
