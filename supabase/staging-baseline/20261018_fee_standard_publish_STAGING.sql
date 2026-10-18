-- Staging only. In the Supabase SQL Editor, first verify that the project is
-- el-town-staging and its Project ID is zghcorbdtslrjtkkspfe.
-- SQL cannot prove the Supabase Project ID on its own.
BEGIN;

DO $staging_fee_publish_guard$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) <> 45
     OR pg_catalog.to_regprocedure('public.publish_membership_fee_standard(bigint)') IS NULL
     OR pg_catalog.to_regprocedure('public.is_el_town_system_admin()') IS NULL
     OR pg_catalog.to_regclass('el_town_staging_private.system_admin_identity') IS NULL
     OR (SELECT count(*) FROM el_town_staging_private.system_admin_identity) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM el_town_staging_private.system_admin_identity
       WHERE auth_user_id = '575133be-3165-4a3c-b008-21c6804f5447'::uuid
     )
     OR (SELECT count(*) FROM public.membership_fee_standard_versions) <> 0
     OR (SELECT count(*) FROM public.neighborhoods) <> 0
     OR pg_catalog.has_function_privilege('anon', 'public.publish_membership_fee_standard(bigint)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected staging state; fee publish grant was not applied';
  END IF;
END;
$staging_fee_publish_guard$;

REVOKE ALL ON FUNCTION public.publish_membership_fee_standard(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_membership_fee_standard(bigint) TO authenticated;

COMMIT;

SELECT
  pg_catalog.has_function_privilege('anon', 'public.publish_membership_fee_standard(bigint)', 'EXECUTE') AS anon_execute,
  pg_catalog.has_function_privilege('authenticated', 'public.publish_membership_fee_standard(bigint)', 'EXECUTE') AS authenticated_execute,
  (SELECT count(*) FROM public.membership_fee_standard_versions) AS fee_versions,
  (SELECT count(*) FROM el_town_staging_private.system_admin_identity) AS configured_admins;
