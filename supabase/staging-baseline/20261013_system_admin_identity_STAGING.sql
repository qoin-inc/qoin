-- Staging only. Apply in el-town-staging (Project ID zghcorbdtslrjtkkspfe).
-- This creates an empty allowlist: no user receives system privileges until a
-- separately verified Auth user ID is inserted in this staging project.
BEGIN;

DO $staging_system_admin_guard$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) <> 45
     OR (SELECT count(*) FROM pg_catalog.pg_policy AS p
         JOIN pg_catalog.pg_class AS c ON c.oid = p.polrelid
         JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public') <> 1
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy AS p
                    WHERE p.polrelid = 'public.neighborhood_admins'::regclass
                      AND p.polname = 'staging_admin_own_active_membership')
     OR pg_catalog.to_regnamespace('el_town_staging_private') IS NOT NULL
     OR pg_catalog.to_regprocedure('public.is_el_town_system_admin()') IS NULL
     OR pg_catalog.to_regprocedure('public.el_town_actor_is_system_admin()') IS NULL
     OR NOT pg_catalog.has_table_privilege('service_role', 'public.neighborhood_admins', 'UPDATE') THEN
    RAISE EXCEPTION 'Unexpected staging database state; system identity was not created';
  END IF;
END;
$staging_system_admin_guard$;

CREATE SCHEMA el_town_staging_private;
REVOKE ALL ON SCHEMA el_town_staging_private FROM PUBLIC, anon, authenticated;

CREATE TABLE el_town_staging_private.system_admin_identity (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id)
);
ALTER TABLE el_town_staging_private.system_admin_identity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE el_town_staging_private.system_admin_identity FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_el_town_system_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
  AS $$
    SELECT auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM el_town_staging_private.system_admin_identity AS identity
      WHERE identity.auth_user_id = auth.uid()
    );
  $$;

CREATE OR REPLACE FUNCTION public.el_town_actor_is_system_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog
  AS $$ SELECT public.is_el_town_system_admin(); $$;

REVOKE ALL ON FUNCTION public.is_el_town_system_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.el_town_actor_is_system_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_el_town_system_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.el_town_actor_is_system_admin() TO authenticated, service_role;

COMMIT;
