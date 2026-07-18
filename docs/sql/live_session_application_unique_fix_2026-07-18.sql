-- Make one Live application per meeting and resident. Re-applying updates the
-- existing row instead of adding another participant entry.

WITH ranked_applications AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY live_session_id, resident_roster_id
      ORDER BY COALESCE(updated_at, applied_at) DESC NULLS LAST, id DESC
    ) AS duplicate_rank
  FROM public.live_session_applications
  WHERE live_session_id IS NOT NULL
    AND resident_roster_id IS NOT NULL
)
DELETE FROM public.live_session_applications application
USING ranked_applications ranked
WHERE application.id = ranked.id
  AND ranked.duplicate_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_live_session_applications_unique_resident
  ON public.live_session_applications(live_session_id, resident_roster_id)
  WHERE live_session_id IS NOT NULL AND resident_roster_id IS NOT NULL;

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
  )
  ON CONFLICT (live_session_id, resident_roster_id)
    WHERE live_session_id IS NOT NULL AND resident_roster_id IS NOT NULL
  DO UPDATE SET
    session_id = EXCLUDED.session_id,
    neighborhood_id = EXCLUDED.neighborhood_id,
    user_auth_id = EXCLUDED.user_auth_id,
    resident_name = EXCLUDED.resident_name,
    applicant_name = EXCLUDED.applicant_name,
    participant_count = EXCLUDED.participant_count,
    people_count = EXCLUDED.people_count,
    reply_status = EXCLUDED.reply_status,
    response_status = EXCLUDED.response_status,
    status = EXCLUDED.status,
    applied_at = EXCLUDED.applied_at,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO saved;

  RETURN to_jsonb(saved);
END;
$$;

REVOKE ALL ON FUNCTION public.create_live_session_application(BIGINT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_live_session_application(BIGINT, INTEGER, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT
  (SELECT count(*) FROM public.live_session_applications) AS application_rows,
  (SELECT count(*) FROM (
    SELECT live_session_id, resident_roster_id
    FROM public.live_session_applications
    WHERE live_session_id IS NOT NULL AND resident_roster_id IS NOT NULL
    GROUP BY live_session_id, resident_roster_id
    HAVING count(*) > 1
  ) duplicate_groups) AS duplicate_groups,
  to_regclass('public.idx_live_session_applications_unique_resident') IS NOT NULL AS unique_index_ready;
