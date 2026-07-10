-- 2026-07-06
-- 会費管理の請求設定、Stripe請求、手集金/Stripe入金区分、年度管理で利用する列。
-- Supabase SQL Editorで実行してください。既存列がある場合は追加されません。

ALTER TABLE public.fee_records
  ADD COLUMN IF NOT EXISTS neighborhood_id BIGINT,
  ADD COLUMN IF NOT EXISTS roster_id BIGINT,
  ADD COLUMN IF NOT EXISTS resident_name TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_year INTEGER,
  ADD COLUMN IF NOT EXISTS expected_amount INTEGER,
  ADD COLUMN IF NOT EXISTS billing_amount INTEGER,
  ADD COLUMN IF NOT EXISTS amount INTEGER,
  ADD COLUMN IF NOT EXISTS paid_amount INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount_cash INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount_stripe INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_channel TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'billed',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS is_billed BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS fee_records_roster_year_unique
  ON public.fee_records (roster_id, fiscal_year)
  WHERE roster_id IS NOT NULL AND fiscal_year IS NOT NULL;

COMMENT ON COLUMN public.fee_records.fiscal_year IS '会計年度。町内会・自治会の決算月/開始月に基づく年度。';
COMMENT ON COLUMN public.fee_records.billing_channel IS 'manual または stripe。請求方法の区分。';
COMMENT ON COLUMN public.fee_records.paid_amount_cash IS '手集金で入金された金額。';
COMMENT ON COLUMN public.fee_records.paid_amount_stripe IS 'Stripeで入金された金額。Webhookで自動反映する。';
COMMENT ON COLUMN public.fee_records.stripe_payment_intent_id IS 'Stripe決済ID。';
