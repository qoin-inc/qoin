-- イベント参加申込はイベント・会員ごとに1件へ固定する。
-- 重複済みの場合は更新日時が新しい申込を残す。

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY circular_id, roster_id
           ORDER BY updated_at DESC NULLS LAST, applied_at DESC NULLS LAST, id DESC
         ) AS row_number
  FROM public.event_applications
  WHERE circular_id IS NOT NULL
    AND roster_id IS NOT NULL
    AND reply_status = 'attend'
)
DELETE FROM public.event_applications applications
USING ranked
WHERE applications.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS event_applications_one_attendance_per_roster
ON public.event_applications (circular_id, roster_id)
WHERE circular_id IS NOT NULL
  AND roster_id IS NOT NULL
  AND reply_status = 'attend';

-- roster_idが取得できなかった旧申込も、認証ユーザー単位で重複を防ぐ。
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
    AND reply_status = 'attend'
)
DELETE FROM public.event_applications applications
USING ranked
WHERE applications.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS event_applications_one_attendance_per_user
ON public.event_applications (circular_id, user_auth_id)
WHERE circular_id IS NOT NULL
  AND roster_id IS NULL
  AND user_auth_id IS NOT NULL
  AND reply_status = 'attend';
