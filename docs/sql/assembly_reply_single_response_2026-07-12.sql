-- 総会出欠返信は総会・会員ごとに1件へ固定し、本人による内容変更を許可する。

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY circular_id, roster_id
           ORDER BY updated_at DESC NULLS LAST, applied_at DESC NULLS LAST, id DESC
         ) AS row_number
  FROM public.event_applications
  WHERE circular_id IS NOT NULL
    AND roster_id IS NOT NULL
    AND reply_status IN ('present', 'absent')
)
DELETE FROM public.event_applications applications
USING ranked
WHERE applications.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS event_applications_one_assembly_reply_per_roster
ON public.event_applications (circular_id, roster_id)
WHERE circular_id IS NOT NULL
  AND roster_id IS NOT NULL
  AND reply_status IN ('present', 'absent');

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY circular_id, user_auth_id
           ORDER BY updated_at DESC NULLS LAST, applied_at DESC NULLS LAST, id DESC
         ) AS row_number
  FROM public.event_applications
  WHERE circular_id IS NOT NULL
    AND roster_id IS NULL
    AND user_auth_id IS NOT NULL
    AND reply_status IN ('present', 'absent')
)
DELETE FROM public.event_applications applications
USING ranked
WHERE applications.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS event_applications_one_assembly_reply_per_user
ON public.event_applications (circular_id, user_auth_id)
WHERE circular_id IS NOT NULL
  AND roster_id IS NULL
  AND user_auth_id IS NOT NULL
  AND reply_status IN ('present', 'absent');

DROP POLICY IF EXISTS event_applications_update_own_reply
ON public.event_applications;

CREATE POLICY event_applications_update_own_reply
ON public.event_applications
FOR UPDATE
TO authenticated
USING (user_auth_id = auth.uid())
WITH CHECK (user_auth_id = auth.uid());
