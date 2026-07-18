-- Preserve the legacy UUID facility_id while linking new reservations to the
-- current BIGINT facilities table.

ALTER TABLE public.facility_reservations
  ADD COLUMN IF NOT EXISTS facility_bigint_id BIGINT,
  ADD COLUMN IF NOT EXISTS resident_roster_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.facility_reservations'::regclass
      AND conname = 'facility_reservations_facility_bigint_id_fkey'
  ) THEN
    ALTER TABLE public.facility_reservations
      ADD CONSTRAINT facility_reservations_facility_bigint_id_fkey
      FOREIGN KEY (facility_bigint_id)
      REFERENCES public.facilities(id)
      ON DELETE CASCADE;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_facility_reservations_bigint_facility_date_status
  ON public.facility_reservations(facility_bigint_id, reservation_date, status);

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
  normalized_start TIME;
  normalized_end TIME;
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

  normalized_start := BTRIM(p_start_time)::TIME;
  normalized_end := BTRIM(p_end_time)::TIME;
  IF normalized_start >= normalized_end THEN
    RAISE EXCEPTION '終了時間は開始時間より後にしてください。';
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
    facility_bigint_id, facility_name, title, neighborhood_id,
    resident_roster_id, user_auth_id, applicant_name, resident_name,
    participant_count, people_count, num_people,
    reservation_date, start_time, end_time, status, created_at, updated_at
  ) VALUES (
    target_facility.id, COALESCE(target_facility.name, '施設'), COALESCE(target_facility.name, '施設'),
    target_facility.neighborhood_id, target_roster.id, auth.uid()::TEXT,
    NULLIF(BTRIM(p_applicant_name), ''), NULLIF(BTRIM(p_applicant_name), ''),
    p_participant_count, p_participant_count, p_participant_count,
    p_reservation_date, normalized_start, normalized_end, 'pending', NOW(), NOW()
  ) RETURNING * INTO saved;

  RETURN to_jsonb(saved);
END;
$$;

REVOKE ALL ON FUNCTION public.create_facility_reservation(BIGINT, DATE, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_facility_reservation(BIGINT, DATE, TEXT, TEXT, INTEGER, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT
  (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'facilities' AND column_name = 'id') AS facilities_id_type,
  (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'facility_reservations' AND column_name = 'facility_id') AS legacy_facility_id_type,
  (SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'facility_reservations' AND column_name = 'facility_bigint_id') AS current_facility_id_type,
  to_regprocedure('public.create_facility_reservation(bigint,date,text,text,integer,text)') IS NOT NULL AS rpc_ready;
