-- Apply only to el-town-staging (Project ID zghcorbdtslrjtkkspfe) after the
-- initial private-circular-storage SQL was already run without table SELECT.
BEGIN;
DO $guard$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) <> 45
     OR NOT EXISTS (SELECT 1 FROM storage.buckets
                    WHERE id = 'circular-attachments' AND public = false)
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies
                    WHERE schemaname = 'public' AND tablename = 'circulars'
                      AND policyname = 'circular_read_staging')
     OR pg_catalog.to_regclass('el_town_staging_private.system_admin_identity') IS NULL
     OR NOT EXISTS (SELECT 1 FROM el_town_staging_private.system_admin_identity
                    WHERE auth_user_id = '575133be-3165-4a3c-b008-21c6804f5447'::uuid) THEN
    RAISE EXCEPTION 'Unexpected staging state; circular SELECT not granted';
  END IF;
END;
$guard$;
GRANT SELECT ON public.circulars TO authenticated;
COMMIT;
SELECT pg_catalog.has_table_privilege('authenticated', 'public.circulars', 'SELECT')
  AS authenticated_select,
  pg_catalog.has_table_privilege('anon', 'public.circulars', 'SELECT')
  AS anon_select;
