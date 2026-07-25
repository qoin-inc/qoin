-- 会費請求・入金データの対象世帯を必須化する。
-- 既存6件は旧形式のため、利用者確認のうえ全件削除してから制約を適用する。

BEGIN;

DELETE FROM public.fee_records;

ALTER TABLE public.fee_records
  ADD COLUMN IF NOT EXISTS neighborhood_id BIGINT,
  ADD COLUMN IF NOT EXISTS resident_name TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_year INTEGER,
  ADD COLUMN IF NOT EXISTS billing_amount INTEGER,
  ADD COLUMN IF NOT EXISTS amount INTEGER,
  ADD COLUMN IF NOT EXISTS billing_channel TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'billed',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS billed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

ALTER TABLE public.fee_records
  ALTER COLUMN paid_amount SET DEFAULT 0,
  ALTER COLUMN paid_amount_cash SET DEFAULT 0,
  ALTER COLUMN paid_amount_stripe SET DEFAULT 0,
  ALTER COLUMN billing_channel SET DEFAULT 'manual',
  ALTER COLUMN billing_status SET DEFAULT 'billed',
  ALTER COLUMN status SET DEFAULT 'unpaid',
  ALTER COLUMN is_billed SET DEFAULT TRUE;

ALTER TABLE public.fee_records
  DROP CONSTRAINT IF EXISTS fee_records_roster_id_fkey,
  DROP CONSTRAINT IF EXISTS fee_records_neighborhood_id_fkey,
  DROP CONSTRAINT IF EXISTS fee_records_resident_name_required,
  DROP CONSTRAINT IF EXISTS fee_records_fiscal_year_valid,
  DROP CONSTRAINT IF EXISTS fee_records_expected_amount_valid,
  DROP CONSTRAINT IF EXISTS fee_records_paid_amount_valid;

ALTER TABLE public.fee_records
  ADD CONSTRAINT fee_records_roster_id_fkey
    FOREIGN KEY (roster_id) REFERENCES public.resident_rosters(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fee_records_neighborhood_id_fkey
    FOREIGN KEY (neighborhood_id) REFERENCES public.neighborhoods(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fee_records_resident_name_required
    CHECK (length(btrim(resident_name)) > 0),
  ADD CONSTRAINT fee_records_fiscal_year_valid
    CHECK (fiscal_year BETWEEN 2000 AND 2200),
  ADD CONSTRAINT fee_records_expected_amount_valid
    CHECK (expected_amount >= 0),
  ADD CONSTRAINT fee_records_paid_amount_valid
    CHECK (
      COALESCE(paid_amount, 0) >= 0
      AND COALESCE(paid_amount_cash, 0) >= 0
      AND COALESCE(paid_amount_stripe, 0) >= 0
    );

CREATE OR REPLACE FUNCTION public.set_fee_record_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  roster public.resident_rosters;
  snapshot_name TEXT;
BEGIN
  IF NEW.roster_id IS NULL THEN
    RAISE EXCEPTION '会費請求には対象世帯の名簿IDが必要です。';
  END IF;

  SELECT *
    INTO roster
  FROM public.resident_rosters
  WHERE id = NEW.roster_id;

  IF roster.id IS NULL THEN
    RAISE EXCEPTION '対象世帯の名簿が存在しません。';
  END IF;

  snapshot_name := COALESCE(
    NULLIF(btrim(roster.full_name), ''),
    NULLIF(btrim(concat_ws(' ', roster.last_name, roster.first_name)), ''),
    '名称未設定'
  );

  NEW.neighborhood_id := roster.neighborhood_id;
  NEW.resident_name := snapshot_name;
  NEW.full_name := snapshot_name;
  NEW.fiscal_year := COALESCE(NEW.fiscal_year, NEW.year);
  NEW.year := COALESCE(NEW.year, NEW.fiscal_year);
  NEW.expected_amount := COALESCE(NEW.expected_amount, NEW.billing_amount, NEW.amount);
  NEW.billing_amount := COALESCE(NEW.billing_amount, NEW.expected_amount);
  NEW.amount := COALESCE(NEW.amount, NEW.expected_amount);

  IF NEW.neighborhood_id IS NULL THEN
    RAISE EXCEPTION '対象世帯に町内会・自治会が設定されていません。';
  END IF;
  IF NEW.fiscal_year IS NULL THEN
    RAISE EXCEPTION '会費請求には会計年度が必要です。';
  END IF;
  IF NEW.expected_amount IS NULL THEN
    RAISE EXCEPTION '会費請求には請求額が必要です。';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fee_records_set_identity
ON public.fee_records;
CREATE TRIGGER fee_records_set_identity
BEFORE INSERT OR UPDATE OF roster_id
ON public.fee_records
FOR EACH ROW
EXECUTE FUNCTION public.set_fee_record_identity();

ALTER TABLE public.fee_records
  ALTER COLUMN roster_id SET NOT NULL,
  ALTER COLUMN neighborhood_id SET NOT NULL,
  ALTER COLUMN resident_name SET NOT NULL,
  ALTER COLUMN fiscal_year SET NOT NULL,
  ALTER COLUMN expected_amount SET NOT NULL;

DROP INDEX IF EXISTS public.fee_records_roster_year_unique;
CREATE UNIQUE INDEX fee_records_roster_year_unique
  ON public.fee_records (roster_id, fiscal_year);

COMMENT ON COLUMN public.fee_records.roster_id IS '請求対象世帯のresident_rosters.id。必須。';
COMMENT ON COLUMN public.fee_records.neighborhood_id IS '対象世帯の町内会・自治会ID。名簿から自動設定。';
COMMENT ON COLUMN public.fee_records.resident_name IS '請求作成時点の世帯主氏名スナップショット。';
COMMENT ON COLUMN public.fee_records.fiscal_year IS '会費の対象年度。';

NOTIFY pgrst, 'reload schema';

COMMIT;
