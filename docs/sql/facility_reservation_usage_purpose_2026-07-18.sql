-- 施設予約へ使用用途を追加し、既存・新UIの両方から予約できるRPCへ更新する。

ALTER TABLE public.facility_reservations
  ADD COLUMN IF NOT EXISTS usage_purpose TEXT;

COMMENT ON COLUMN public.facility_reservations.usage_purpose IS '施設の使用用途。例: 役員会、子ども会、交流会。';

DROP FUNCTION IF EXISTS public.create_facility_reservation(BIGINT, DATE, TEXT, TEXT, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.create_facility_reservation(
  p_facility_id BIGINT,
  p_reservation_date DATE,
  p_start_time TEXT,
  p_end_time TEXT,
  p_participant_count INTEGER,
  p_applicant_name TEXT,
  p_usage_purpose TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_facility public.facilities%ROWTYPE;
  target_roster public.resident_rosters%ROWTYPE;
  saved public.facility_reservations%ROWTYPE;
  normalized_start TIME;
  normalized_end TIME;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LINE認証が必要です。'; END IF;
  IF p_reservation_date IS NULL OR NULLIF(BTRIM(p_start_time), '') IS NULL OR NULLIF(BTRIM(p_end_time), '') IS NULL THEN
    RAISE EXCEPTION '予約年月日と利用時間を入力してください。';
  END IF;
  IF COALESCE(p_participant_count, 0) <= 0 THEN RAISE EXCEPTION '利用人数を入力してください。'; END IF;

  normalized_start := BTRIM(p_start_time)::TIME;
  normalized_end := BTRIM(p_end_time)::TIME;
  IF normalized_start >= normalized_end THEN RAISE EXCEPTION '終了時間は開始時間より後にしてください。'; END IF;

  SELECT * INTO target_facility FROM public.facilities
  WHERE id = p_facility_id AND COALESCE(is_active, TRUE) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION '予約できる施設が見つかりません。'; END IF;

  SELECT * INTO target_roster FROM public.resident_rosters roster
  WHERE roster.neighborhood_id = target_facility.neighborhood_id
    AND COALESCE(roster.withdrawal_status, 'active') <> 'withdrawn'
    AND (
      roster.user_auth_id::TEXT = auth.uid()::TEXT
      OR (roster.family_user_auth_id_1::TEXT = auth.uid()::TEXT AND COALESCE(roster.family_withdrawal_status_1, 'active') <> 'withdrawn')
      OR (roster.family_user_auth_id_2::TEXT = auth.uid()::TEXT AND COALESCE(roster.family_withdrawal_status_2, 'active') <> 'withdrawn')
    ) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'この町内会に連携された会員情報を確認できません。LINEから再度接続してください。'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(target_facility.id::TEXT || ':' || p_reservation_date::TEXT, 0));
  IF EXISTS (
    SELECT 1 FROM public.facility_reservations existing
    WHERE existing.facility_bigint_id = target_facility.id
      AND existing.reservation_date = p_reservation_date
      AND existing.status IN ('pending', 'approved')
      AND existing.start_time::TIME < normalized_end
      AND normalized_start < existing.end_time::TIME
  ) THEN
    RAISE EXCEPTION 'この施設・日付・時間帯は既に予約されています。別の時間を選択してください。';
  END IF;

  INSERT INTO public.facility_reservations (
    facility_bigint_id, facility_name, title, neighborhood_id, resident_roster_id, user_auth_id,
    applicant_name, resident_name, participant_count, people_count, num_people, usage_purpose,
    reservation_date, start_time, end_time, status, created_at, updated_at
  ) VALUES (
    target_facility.id, COALESCE(target_facility.name, '施設'), COALESCE(target_facility.name, '施設'), target_facility.neighborhood_id,
    target_roster.id, auth.uid()::TEXT, NULLIF(BTRIM(p_applicant_name), ''), NULLIF(BTRIM(p_applicant_name), ''),
    p_participant_count, p_participant_count, p_participant_count, NULLIF(BTRIM(p_usage_purpose), ''),
    p_reservation_date, normalized_start, normalized_end, 'pending', NOW(), NOW()
  ) RETURNING * INTO saved;
  RETURN to_jsonb(saved);
END;
$$;

REVOKE ALL ON FUNCTION public.create_facility_reservation(BIGINT, DATE, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_facility_reservation(BIGINT, DATE, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'facility_reservations' AND column_name = 'usage_purpose'
  ) AS usage_purpose_ready,
  to_regprocedure('public.create_facility_reservation(bigint,date,text,text,integer,text,text)') IS NOT NULL AS reservation_rpc_ready;
