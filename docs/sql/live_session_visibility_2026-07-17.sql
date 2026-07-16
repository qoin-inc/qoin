-- LIVEカード・カレンダー表示に必要な列の補完。
-- Supabase SQL Editorで実行してください。

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS event_time TEXT,
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS meeting_url TEXT,
  ADD COLUMN IF NOT EXISTS live_url TEXT,
  ADD COLUMN IF NOT EXISTS event_url TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

UPDATE public.live_sessions
SET event_date = COALESCE(
  event_date,
  (starts_at AT TIME ZONE 'Asia/Tokyo')::date,
  (created_at AT TIME ZONE 'Asia/Tokyo')::date
)
WHERE event_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_live_sessions_neighborhood_date
  ON public.live_sessions(neighborhood_id, event_date);

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
        OR (rosters.family_user_auth_id_1::TEXT = auth.uid()::TEXT AND COALESCE(rosters.family_withdrawal_status_1, 'active') <> 'withdrawn')
        OR (rosters.family_user_auth_id_2::TEXT = auth.uid()::TEXT AND COALESCE(rosters.family_withdrawal_status_2, 'active') <> 'withdrawn')
      )
  )
);

NOTIFY pgrst, 'reload schema';
