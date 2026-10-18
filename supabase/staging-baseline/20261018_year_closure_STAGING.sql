-- Staging only. Before running in the Supabase SQL Editor, verify the
-- project name el-town-staging and Project ID zghcorbdtslrjtkkspfe.
-- SQL alone cannot identify the Supabase project.
BEGIN;

DO $staging_year_closure_guard$
DECLARE
  signature text;
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) <> 45
     OR pg_catalog.to_regclass('el_town_staging_private.system_admin_identity') IS NULL
     OR (SELECT count(*) FROM el_town_staging_private.system_admin_identity) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM el_town_staging_private.system_admin_identity
       WHERE auth_user_id = '575133be-3165-4a3c-b008-21c6804f5447'::uuid
     ) THEN
    RAISE EXCEPTION 'Unexpected staging state; year closure grant was not applied';
  END IF;

  FOREACH signature IN ARRAY ARRAY[
    'public.finalize_fee_year(bigint,integer)',
    'public.unlock_fee_year(bigint,integer,text)',
    'public.finalize_assembly_year(bigint,integer)',
    'public.unlock_assembly_year(bigint,integer,text)'
  ] LOOP
    IF pg_catalog.to_regprocedure(signature) IS NULL
       OR pg_catalog.has_function_privilege('anon', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Unexpected function or anonymous grant: %', signature;
    END IF;
  END LOOP;
END;
$staging_year_closure_guard$;

REVOKE ALL ON FUNCTION public.finalize_fee_year(bigint, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unlock_fee_year(bigint, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finalize_assembly_year(bigint, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unlock_assembly_year(bigint, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_fee_year(bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_fee_year(bigint, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_assembly_year(bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_assembly_year(bigint, integer, text) TO authenticated;

COMMIT;

SELECT p.proname AS function_name,
       pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('finalize_fee_year', 'unlock_fee_year',
                   'finalize_assembly_year', 'unlock_assembly_year')
ORDER BY p.proname;
