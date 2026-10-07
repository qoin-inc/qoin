-- Local test fixture for the staging invite flow. Do not run against a Supabase project.
-- The application server uses service_role for token lookup and acceptance. The
-- authenticated browser receives only the columns needed to prove its own active
-- neighborhood_admins membership, never an invitation token or write access.
BEGIN;

DO $guard$
BEGIN
  IF current_setting('el_town.local_staging_access_test', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Local staging access test only';
  END IF;
END;
$guard$;

GRANT SELECT (id, neighborhood_id, admin_auth_id, status)
  ON public.neighborhood_admins TO authenticated;

CREATE POLICY staging_admin_own_active_membership
  ON public.neighborhood_admins
  FOR SELECT TO authenticated
  USING (admin_auth_id = (SELECT auth.uid()) AND status = 'active');

COMMIT;
