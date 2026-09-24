ALTER TABLE public.fee_records
  ADD COLUMN IF NOT EXISTS cash_collection_requested BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.fee_records.cash_collection_requested
  IS '会員世帯が役員による集金を希望したか。入金の記録とは別に管理する。';

CREATE OR REPLACE FUNCTION public.set_own_fee_cash_collection_request(
  p_fee_record_id TEXT,
  p_requested BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_fee public.fee_records%ROWTYPE;
  saved_requested BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '会員ログインが必要です。';
  END IF;
  IF p_requested IS NULL THEN
    RAISE EXCEPTION '集金希望の指定が必要です。';
  END IF;

  SELECT * INTO target_fee
  FROM public.fee_records
  WHERE id::TEXT = p_fee_record_id
  FOR UPDATE;
  IF NOT FOUND OR target_fee.roster_id IS NULL THEN
    RAISE EXCEPTION '対象の会費請求を確認できません。';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.resident_rosters AS roster
    WHERE roster.id = target_fee.roster_id
      AND roster.neighborhood_id = target_fee.neighborhood_id
      AND auth.uid()::TEXT IN (
        roster.user_auth_id::TEXT,
        roster.family_user_auth_id_1::TEXT,
        roster.family_user_auth_id_2::TEXT
      )
  ) THEN
    RAISE EXCEPTION 'この会費請求を変更する権限がありません。';
  END IF;

  IF p_requested AND EXISTS (
    SELECT 1
    FROM public.neighborhood_fee_settings AS settings
    WHERE settings.neighborhood_id = target_fee.neighborhood_id
      AND settings.cash_enabled = FALSE
  ) THEN
    RAISE EXCEPTION 'この団体では集金を受け付けていません。';
  END IF;

  IF p_requested AND COALESCE(target_fee.expected_amount, target_fee.billing_amount, target_fee.amount, 0)
    <= COALESCE(target_fee.paid_amount, COALESCE(target_fee.paid_amount_cash, 0) + COALESCE(target_fee.paid_amount_stripe, 0)) THEN
    RAISE EXCEPTION '完納済みの会費には集金を希望できません。';
  END IF;

  UPDATE public.fee_records
  SET cash_collection_requested = p_requested
  WHERE id::TEXT = p_fee_record_id
  RETURNING cash_collection_requested INTO saved_requested;

  RETURN saved_requested;
END;
$$;

REVOKE ALL ON FUNCTION public.set_own_fee_cash_collection_request(TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_own_fee_cash_collection_request(TEXT, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
