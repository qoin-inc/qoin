-- Staging only: let an authenticated user read their own active admin membership.
-- Apply only in el-town-staging, Project ID zghcorbdtslrjtkkspfe.
-- This is not a general application access policy.
BEGIN;

DO $staging_membership_guard$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) <> 45
     OR (SELECT count(*) FROM pg_catalog.pg_policy AS p
         JOIN pg_catalog.pg_class AS c ON c.oid = p.polrelid
         JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public') <> 0
     OR pg_catalog.to_regclass('public.neighborhood_admins') IS NULL
     OR NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class AS c
             WHERE c.oid = 'public.neighborhood_admins'::regclass)
     OR pg_catalog.has_table_privilege('anon', 'public.neighborhood_admins', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'public.neighborhood_admins', 'SELECT')
     OR NOT pg_catalog.has_table_privilege('service_role', 'public.neighborhood_admins', 'UPDATE') THEN
    RAISE EXCEPTION 'Unexpected staging baseline or admin privileges; membership policy was not applied';
  END IF;
END;
$staging_membership_guard$;

GRANT SELECT (id, neighborhood_id, admin_auth_id, status)
  ON public.neighborhood_admins TO authenticated;

CREATE POLICY staging_admin_own_active_membership
  ON public.neighborhood_admins
  FOR SELECT TO authenticated
  USING (admin_auth_id = (SELECT auth.uid()) AND status = 'active');

COMMIT;
