-- Keep fee-year finalization compatible with both legacy and current roster address columns.
CREATE OR REPLACE FUNCTION public.finalize_fee_year(p_neighborhood_id BIGINT, p_fiscal_year INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closure public.fee_year_closures;
  next_revision INTEGER;
  snapshot_count INTEGER;
  event_name TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('fee-year:' || p_neighborhood_id || ':' || p_fiscal_year, 0));
  IF NOT public.fee_actor_is_admin(p_neighborhood_id) THEN RAISE EXCEPTION '年度会費を確定する権限がありません。'; END IF;
  IF p_fiscal_year NOT BETWEEN 2000 AND 2200 THEN RAISE EXCEPTION '会計年度が不正です。'; END IF;
  LOCK TABLE public.fee_records IN SHARE ROW EXCLUSIVE MODE;

  SELECT * INTO closure FROM public.fee_year_closures
  WHERE neighborhood_id = p_neighborhood_id AND fiscal_year = p_fiscal_year FOR UPDATE;
  IF closure.id IS NOT NULL AND closure.status = 'locked' THEN RAISE EXCEPTION '%年度は確定済みです。', p_fiscal_year; END IF;
  IF closure.id IS NOT NULL AND NOT public.fee_actor_is_representative(p_neighborhood_id) THEN
    RAISE EXCEPTION '確定解除後の再確定は代表者だけが実行できます。';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fee_records WHERE neighborhood_id = p_neighborhood_id AND fiscal_year = p_fiscal_year) THEN
    RAISE EXCEPTION '確定対象の会費データがありません。';
  END IF;

  next_revision := COALESCE(closure.revision, 0) + 1;
  event_name := CASE WHEN closure.id IS NULL THEN 'locked' ELSE 'relocked' END;

  INSERT INTO public.fee_year_closures (
    neighborhood_id, fiscal_year, status, revision, locked_at, locked_by,
    unlocked_at, unlocked_by, unlock_reason, updated_at
  ) VALUES (
    p_neighborhood_id, p_fiscal_year, 'locked', next_revision, NOW(), auth.uid(),
    NULL, NULL, NULL, NOW()
  )
  ON CONFLICT (neighborhood_id, fiscal_year) DO UPDATE SET
    status = 'locked', revision = EXCLUDED.revision, locked_at = NOW(), locked_by = auth.uid(),
    unlocked_at = NULL, unlocked_by = NULL, unlock_reason = NULL, updated_at = NOW()
  RETURNING * INTO closure;

  INSERT INTO public.fee_year_snapshot_rows (
    closure_id, revision, fee_record_id, neighborhood_id, fiscal_year,
    roster_id_snapshot, resident_name, resident_kana, postal_code, address_text,
    billing_amount, paid_amount, paid_amount_cash, paid_amount_stripe,
    payment_method, payment_status, fee_data, member_data, captured_by
  )
  SELECT
    closure.id, next_revision, fee.id::TEXT, fee.neighborhood_id, fee.fiscal_year,
    COALESCE(fee.roster_id_snapshot, fee.roster_id::TEXT), fee.resident_name,
    COALESCE(to_jsonb(roster) ->> 'kana_name', to_jsonb(roster) ->> 'full_name_kana'),
    to_jsonb(roster) ->> 'postal_code',
    concat_ws(
      ' ',
      NULLIF(COALESCE(to_jsonb(roster) ->> 'address_line2', to_jsonb(roster) ->> 'address2', to_jsonb(roster) ->> 'address'), ''),
      NULLIF(COALESCE(to_jsonb(roster) ->> 'address_line3', to_jsonb(roster) ->> 'address3'), '')
    ),
    COALESCE(fee.expected_amount, fee.billing_amount, fee.amount, 0),
    COALESCE(fee.paid_amount, 0), COALESCE(fee.paid_amount_cash, 0), COALESCE(fee.paid_amount_stripe, 0),
    fee.payment_method, fee.status, to_jsonb(fee),
    CASE WHEN roster.id IS NOT NULL THEN to_jsonb(roster) ELSE COALESCE(fee.member_snapshot, '{}'::JSONB) END,
    auth.uid()
  FROM public.fee_records AS fee
  LEFT JOIN public.resident_rosters AS roster ON roster.id = fee.roster_id
  WHERE fee.neighborhood_id = p_neighborhood_id AND fee.fiscal_year = p_fiscal_year;

  GET DIAGNOSTICS snapshot_count = ROW_COUNT;
  INSERT INTO public.fee_year_lock_events (
    closure_id, neighborhood_id, fiscal_year, revision, event_type, actor_auth_id
  ) VALUES (closure.id, p_neighborhood_id, p_fiscal_year, next_revision, event_name, auth.uid());

  RETURN jsonb_build_object('status', 'locked', 'revision', next_revision, 'snapshotCount', snapshot_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_fee_year(BIGINT, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.finalize_fee_year(BIGINT, INTEGER)
  IS '会費年度を確定し、旧・新どちらの名簿住所列にも対応した改版スナップショットを保存する。';
