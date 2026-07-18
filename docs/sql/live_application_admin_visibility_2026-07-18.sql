-- Allow active neighborhood officers to view Live applications for their own
-- neighborhood. The table already has RLS enabled in production, but had no
-- SELECT policy, so valid applications were returned to the admin UI as zero rows.

ALTER TABLE public.live_session_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_session_applications_select_active_admins
ON public.live_session_applications;

CREATE POLICY live_session_applications_select_active_admins
ON public.live_session_applications
FOR SELECT
TO authenticated
USING (
  neighborhood_id IN (
    SELECT admins.neighborhood_id
    FROM public.neighborhood_admins admins
    WHERE admins.admin_auth_id = auth.uid()
      AND admins.status = 'active'
  )
);

SELECT
  relrowsecurity AS rls_enabled,
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'live_session_applications'
      AND policyname = 'live_session_applications_select_active_admins'
      AND cmd = 'SELECT'
  ) AS admin_select_policy_ready
FROM pg_class
WHERE oid = 'public.live_session_applications'::regclass;
