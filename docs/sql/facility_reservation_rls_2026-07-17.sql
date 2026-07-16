-- システム管理者による施設管理と、会員による施設予約RPC。
-- Supabase SQL Editorで実行してください。

DROP POLICY IF EXISTS facilities_system_admin_all ON public.facilities;
CREATE POLICY facilities_system_admin_all
ON public.facilities
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'email') = 'admin@el-town.jp')
WITH CHECK ((auth.jwt() ->> 'email') = 'admin@el-town.jp');

CREATE OR REPLACE FUNCTION public.create_facility_reservation(
  p_facility_id BIGINT,
  p_reservation_date DATE,
  p_start_time TEXT,
  p_end_time TEXT,
  p_participant_count INTEGER,
  p_applicant_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_facility public.facilities%ROWTYPE;
  target_roster public.resident_rosters%ROWTYPE;
  saved public.facility_reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LINE認証が必要です。';
  END IF;
  IF p_reservation_date IS NULL OR NULLIF(BTRIM(p_start_time), '') IS NULL OR NULLIF(BTRIM(p_end_time), '') IS NULL THEN
    RAISE EXCEPTION '予約年月日と利用時間を入力してください。';
  END IF;
  IF COALESCE(p_participant_count, 0) <= 0 THEN
    RAISE EXCEPTION '利用人数を入力してください。';
  END IF;

  SELECT * INTO target_facility
  FROM public.facilities
  WHERE id = p_facility_id AND COALESCE(is_active, TRUE)
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION '予約できる施設が見つかりません。';
  END IF;

  SELECT * INTO target_roster
  FROM public.resident_rosters roster
  WHERE roster.neighborhood_id = target_facility.neighborhood_id
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

  INSERT INTO public.facility_reservations (
    facility_id, facility_name, neighborhood_id, roster_id, user_auth_id,
    applicant_name, resident_name, participant_count, people_count,
    reservation_date, start_time, end_time, status, created_at, updated_at
  ) VALUES (
    target_facility.id, COALESCE(target_facility.name, '施設'), target_facility.neighborhood_id,
    target_roster.id, auth.uid()::TEXT, NULLIF(BTRIM(p_applicant_name), ''), NULLIF(BTRIM(p_applicant_name), ''),
    p_participant_count, p_participant_count, p_reservation_date, BTRIM(p_start_time), BTRIM(p_end_time),
    'pending', NOW(), NOW()
  ) RETURNING * INTO saved;

  RETURN to_jsonb(saved);
END;
$$;

REVOKE ALL ON FUNCTION public.create_facility_reservation(BIGINT, DATE, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_facility_reservation(BIGINT, DATE, TEXT, TEXT, INTEGER, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
