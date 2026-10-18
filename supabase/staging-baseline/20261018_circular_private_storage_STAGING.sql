-- Staging only. Confirm dashboard project el-town-staging, ID zghcorbdtslrjtkkspfe.
-- This SQL cannot independently identify the Supabase project.
BEGIN;

DO $guard$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) <> 45
     OR pg_catalog.to_regclass('el_town_staging_private.system_admin_identity') IS NULL
     OR (SELECT count(*) FROM el_town_staging_private.system_admin_identity) <> 1
     OR NOT EXISTS (SELECT 1 FROM el_town_staging_private.system_admin_identity
                    WHERE auth_user_id = '575133be-3165-4a3c-b008-21c6804f5447'::uuid)
     OR EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'circular-attachments')
     OR pg_catalog.to_regprocedure('public.can_access_circular_attachment(bigint,boolean)') IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected staging state; private circular storage was not created';
  END IF;
END;
$guard$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('circular-attachments', 'circular-attachments', false, 10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);

CREATE FUNCTION public.can_access_circular_attachment(p_neighborhood_id bigint, p_write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $access$
  SELECT auth.uid() IS NOT NULL AND p_neighborhood_id > 0 AND (
    EXISTS (SELECT 1 FROM public.neighborhood_admins a
      WHERE a.neighborhood_id = p_neighborhood_id AND a.admin_auth_id = auth.uid()
        AND a.status = 'active')
    OR (NOT p_write AND EXISTS (SELECT 1 FROM public.resident_rosters r
      WHERE r.neighborhood_id = p_neighborhood_id
        AND COALESCE(r.withdrawal_status, 'active') <> 'withdrawn'
        AND (r.user_auth_id = auth.uid()
          OR (r.family_user_auth_id_1 = auth.uid()::text
              AND COALESCE(r.family_withdrawal_status_1, 'active') <> 'withdrawn')
          OR (r.family_user_auth_id_2 = auth.uid()::text
              AND COALESCE(r.family_withdrawal_status_2, 'active') <> 'withdrawn'))))
  );
$access$;
REVOKE ALL ON FUNCTION public.can_access_circular_attachment(bigint,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_circular_attachment(bigint,boolean) TO authenticated;

CREATE POLICY circular_attachment_read_staging ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'circular-attachments' AND CASE
    WHEN name ~ '^[1-9][0-9]{0,14}/circulars/[A-Za-z0-9._-]+$'
    THEN public.can_access_circular_attachment(split_part(name, '/', 1)::bigint, false)
    ELSE false END);

CREATE POLICY circular_attachment_insert_staging ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'circular-attachments' AND CASE
    WHEN name ~ '^[1-9][0-9]{0,14}/circulars/[A-Za-z0-9._-]+$'
    THEN public.can_access_circular_attachment(split_part(name, '/', 1)::bigint, true)
    ELSE false END);

CREATE POLICY circular_read_staging ON public.circulars
  FOR SELECT TO authenticated
  USING (public.can_access_circular_attachment(neighborhood_id, false));
GRANT SELECT ON public.circulars TO authenticated;

COMMIT;

SELECT b.id, b.public, b.file_size_limit,
  (SELECT count(*) FROM pg_catalog.pg_policies p WHERE p.schemaname = 'storage'
     AND p.tablename = 'objects' AND p.policyname IN (
       'circular_attachment_read_staging', 'circular_attachment_insert_staging')) AS policy_count
FROM storage.buckets b WHERE b.id = 'circular-attachments';
