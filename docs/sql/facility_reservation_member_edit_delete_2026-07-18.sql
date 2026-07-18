-- 会員本人による施設予約の修正・削除を安全なRPCで提供する。
-- 修正時は管理者の承認状態を必ず pending（予約中）へ戻す。

DROP FUNCTION IF EXISTS public.update_own_facility_reservation(BIGINT, BIGINT, DATE, TEXT, TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.delete_own_facility_reservation(BIGINT);

CREATE OR REPLACE FUNCTION public.update_own_facility_reservation(
  p_reservation_id UUID,
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
  target_reservation public.facility_reservations%ROWTYPE;
  target_facility public.facilities%ROWTYPE;
  saved public.facility_reservations%ROWTYPE;
  normalized_start TIME;
  normalized_end TIME;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LINE認証が必要です。'; END IF;

  SELECT * INTO target_reservation
  FROM public.facility_reservations reservation
  WHERE reservation.id = p_reservation_id
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION '修正する施設予約が見つかりません。'; END IF;

  IF NOT (
    target_reservation.user_auth_id::TEXT = auth.uid()::TEXT
    OR EXISTS (
      SELECT 1
      FROM public.resident_rosters roster
      WHERE roster.id = target_reservation.resident_roster_id
        AND (
          roster.user_auth_id::TEXT = auth.uid()::TEXT
          OR roster.family_user_auth_id_1::TEXT = auth.uid()::TEXT
          OR roster.family_user_auth_id_2::TEXT = auth.uid()::TEXT
        )
    )
  ) THEN
    RAISE EXCEPTION '本人が申し込んだ施設予約だけ修正できます。';
  END IF;

  IF p_reservation_date IS NULL OR NULLIF(BTRIM(p_start_time), '') IS NULL OR NULLIF(BTRIM(p_end_time), '') IS NULL THEN
    RAISE EXCEPTION '予約年月日と利用時間を入力してください。';
  END IF;
  IF COALESCE(p_participant_count, 0) <= 0 THEN RAISE EXCEPTION '利用人数を入力してください。'; END IF;
  IF NULLIF(BTRIM(p_usage_purpose), '') IS NULL THEN RAISE EXCEPTION '使用用途を入力してください。'; END IF;

  normalized_start := BTRIM(p_start_time)::TIME;
  normalized_end := BTRIM(p_end_time)::TIME;
  IF normalized_start >= normalized_end THEN RAISE EXCEPTION '終了時間は開始時間より後にしてください。'; END IF;

  SELECT * INTO target_facility
  FROM public.facilities facility
  WHERE facility.id = p_facility_id
    AND facility.neighborhood_id = target_reservation.neighborhood_id
    AND COALESCE(facility.is_active, TRUE)
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION '予約できる施設が見つかりません。'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(target_facility.id::TEXT || ':' || p_reservation_date::TEXT, 0));
  IF EXISTS (
    SELECT 1
    FROM public.facility_reservations existing
    WHERE existing.id <> target_reservation.id
      AND existing.facility_bigint_id = target_facility.id
      AND existing.reservation_date = p_reservation_date
      AND existing.status IN ('pending', 'approved')
      AND existing.start_time::TIME < normalized_end
      AND normalized_start < existing.end_time::TIME
  ) THEN
    RAISE EXCEPTION 'この施設・日付・時間帯は既に予約されています。別の時間を選択してください。';
  END IF;

  UPDATE public.facility_reservations
  SET facility_bigint_id = target_facility.id,
      facility_name = COALESCE(target_facility.name, '施設'),
      title = COALESCE(target_facility.name, '施設'),
      applicant_name = NULLIF(BTRIM(p_applicant_name), ''),
      resident_name = NULLIF(BTRIM(p_applicant_name), ''),
      participant_count = p_participant_count,
      people_count = p_participant_count,
      num_people = p_participant_count,
      reservation_date = p_reservation_date,
      start_time = normalized_start,
      end_time = normalized_end,
      usage_purpose = NULLIF(BTRIM(p_usage_purpose), ''),
      status = 'pending',
      updated_at = NOW()
  WHERE id = target_reservation.id
  RETURNING * INTO saved;

  RETURN to_jsonb(saved);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_facility_reservation(
  p_reservation_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted public.facility_reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LINE認証が必要です。'; END IF;

  DELETE FROM public.facility_reservations reservation
  WHERE reservation.id = p_reservation_id
    AND (
      reservation.user_auth_id::TEXT = auth.uid()::TEXT
      OR EXISTS (
        SELECT 1
        FROM public.resident_rosters roster
        WHERE roster.id = reservation.resident_roster_id
          AND (
            roster.user_auth_id::TEXT = auth.uid()::TEXT
            OR roster.family_user_auth_id_1::TEXT = auth.uid()::TEXT
            OR roster.family_user_auth_id_2::TEXT = auth.uid()::TEXT
          )
      )
    )
  RETURNING reservation.* INTO deleted;

  IF NOT FOUND THEN RAISE EXCEPTION '本人が申し込んだ施設予約が見つかりません。'; END IF;
  RETURN to_jsonb(deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.update_own_facility_reservation(UUID, BIGINT, DATE, TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_own_facility_reservation(UUID, BIGINT, DATE, TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_own_facility_reservation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_facility_reservation(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT
  to_regprocedure('public.update_own_facility_reservation(uuid,bigint,date,text,text,integer,text,text)') IS NOT NULL AS member_update_rpc_ready,
  to_regprocedure('public.delete_own_facility_reservation(uuid)') IS NOT NULL AS member_delete_rpc_ready;
