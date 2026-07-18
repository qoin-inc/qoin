-- Keep the legacy BIGINT roster_id column for compatibility, while linking
-- Live applications to the UUID primary key used by resident_rosters.

ALTER TABLE public.live_session_applications
  ADD COLUMN IF NOT EXISTS resident_roster_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.live_session_applications'::regclass
      AND conname = 'live_session_applications_resident_roster_id_fkey'
  ) THEN
    ALTER TABLE public.live_session_applications
      ADD CONSTRAINT live_session_applications_resident_roster_id_fkey
      FOREIGN KEY (resident_roster_id)
      REFERENCES public.resident_rosters(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_live_session_applications_resident_roster
  ON public.live_session_applications(resident_roster_id, applied_at);

CREATE OR REPLACE FUNCTION public.create_live_session_application(
  p_live_session_id BIGINT,
  p_participant_count INTEGER,
  p_applicant_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_session public.live_sessions%ROWTYPE;
  target_roster public.resident_rosters%ROWTYPE;
  saved public.live_session_applications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LINE認証が必要です。';
  END IF;
  IF COALESCE(p_participant_count, 0) <= 0 THEN
    RAISE EXCEPTION '参加人数を入力してください。';
  END IF;

  SELECT * INTO target_session
  FROM public.live_sessions
  WHERE id = p_live_session_id
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION '参加できるWeb会議が見つかりません。';
  END IF;

  SELECT * INTO target_roster
  FROM public.resident_rosters roster
  WHERE roster.neighborhood_id = target_session.neighborhood_id
    AND COALESCE(roster.withdrawal_status, 'active') <> 'withdrawn'
    AND (
      roster.user_auth_id::TEXT = auth.uid()::TEXT
      OR (roster.family_user_auth_id_1::TEXT = auth.uid()::TEXT AND COALESCE(roster.family_withdrawal_status_1, 'active') <> 'withdrawn')
      OR (roster.family_user_auth_id_2::TEXT = auth.uid()::TEXT AND COALESCE(roster.family_withdrawal_status_2, 'active') <> 'withdrawn')
    )
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'この町内会に連携された会員情報を確認できません。LINEから再度接続してください。';
  END IF;

  INSERT INTO public.live_session_applications (
    live_session_id, session_id, neighborhood_id, resident_roster_id,
    user_auth_id, resident_name, applicant_name, participant_count,
    people_count, reply_status, response_status, status, applied_at, updated_at
  ) VALUES (
    target_session.id, target_session.id, target_session.neighborhood_id, target_roster.id,
    auth.uid()::TEXT, NULLIF(BTRIM(p_applicant_name), ''), NULLIF(BTRIM(p_applicant_name), ''),
    p_participant_count, p_participant_count, 'attend', 'attend', 'attend', NOW(), NOW()
  ) RETURNING * INTO saved;

  RETURN to_jsonb(saved);
END;
$$;

REVOKE ALL ON FUNCTION public.create_live_session_application(BIGINT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_live_session_application(BIGINT, INTEGER, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT
  (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'resident_rosters' AND column_name = 'id') AS roster_id_type,
  (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'live_session_applications' AND column_name = 'resident_roster_id') AS application_roster_id_type,
  to_regprocedure('public.create_live_session_application(bigint,integer,text)') IS NOT NULL AS rpc_ready;
