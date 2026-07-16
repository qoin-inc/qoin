-- LIVE予定を同じ町内会の会員・家族から閲覧可能にする。
-- Supabase SQL Editorで実行してください。

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS live_sessions_select_town_members
ON public.live_sessions;

CREATE POLICY live_sessions_select_town_members
ON public.live_sessions
FOR SELECT
TO authenticated
USING (
  neighborhood_id IN (
    SELECT admins.neighborhood_id
    FROM public.neighborhood_admins admins
    WHERE admins.admin_auth_id::TEXT = auth.uid()::TEXT
      AND admins.status = 'active'
  )
  OR neighborhood_id IN (
    SELECT rosters.neighborhood_id
    FROM public.resident_rosters rosters
    WHERE COALESCE(rosters.withdrawal_status, 'active') <> 'withdrawn'
      AND (
        rosters.user_auth_id::TEXT = auth.uid()::TEXT
        OR (
          rosters.family_user_auth_id_1::TEXT = auth.uid()::TEXT
          AND COALESCE(rosters.family_withdrawal_status_1, 'active') <> 'withdrawn'
        )
        OR (
          rosters.family_user_auth_id_2::TEXT = auth.uid()::TEXT
          AND COALESCE(rosters.family_withdrawal_status_2, 'active') <> 'withdrawn'
        )
      )
  )
);

NOTIFY pgrst, 'reload schema';
