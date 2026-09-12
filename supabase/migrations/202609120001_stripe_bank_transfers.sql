BEGIN;
ALTER TABLE public.system_usage_payment_profiles ADD COLUMN IF NOT EXISTS bank_account_snapshot jsonb;
ALTER TABLE public.neighborhood_fee_settings ADD COLUMN IF NOT EXISTS stripe_bank_transfer_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.neighborhood_fee_settings DROP CONSTRAINT IF EXISTS neighborhood_fee_settings_payment_method_check;
ALTER TABLE public.neighborhood_fee_settings ADD CONSTRAINT neighborhood_fee_settings_payment_method_check
  CHECK (cash_enabled OR stripe_card_enabled OR stripe_bank_transfer_enabled OR stripe_paypay_enabled OR bank_transfer_enabled) NOT VALID;
-- Keep the legacy flag for compatibility while the prior application is still deployed.
UPDATE public.neighborhood_fee_settings SET stripe_bank_transfer_enabled = true WHERE bank_transfer_enabled;
ALTER TABLE public.neighborhood_fee_settings VALIDATE CONSTRAINT neighborhood_fee_settings_payment_method_check;
CREATE TABLE IF NOT EXISTS public.fee_stripe_customers (
  stripe_account_id text NOT NULL,
  roster_id text NOT NULL,
  stripe_customer_id text NOT NULL,
  PRIMARY KEY (stripe_account_id, roster_id)
);
CREATE TABLE IF NOT EXISTS public.fee_stripe_sessions (
  fee_record_id text PRIMARY KEY,
  stripe_account_id text NOT NULL,
  stripe_customer_id text NOT NULL,
  stripe_session_id text NOT NULL UNIQUE,
  bank_account_snapshot jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.fee_stripe_payments (
  stripe_payment_intent_id text PRIMARY KEY,
  fee_record_id text NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  paid_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fee_stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_stripe_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_stripe_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fee_stripe_customers, public.fee_stripe_sessions, public.fee_stripe_payments FROM anon, authenticated;
GRANT ALL ON public.fee_stripe_customers, public.fee_stripe_sessions, public.fee_stripe_payments TO service_role;

CREATE OR REPLACE FUNCTION public.record_stripe_fee_payment(p_fee_id text, p_payment_intent text, p_amount bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fee public.fee_records%ROWTYPE; inserted_count integer; cash_amount numeric; stripe_amount numeric; billed numeric;
BEGIN
  IF p_amount <= 0 OR p_payment_intent IS NULL OR p_payment_intent = '' THEN RAISE EXCEPTION 'Invalid payment'; END IF;
  SELECT * INTO STRICT fee FROM public.fee_records WHERE id::text = p_fee_id;
  PERFORM pg_advisory_xact_lock(hashtextextended('fee-year:' || fee.neighborhood_id || ':' || fee.fiscal_year, 0));
  SELECT * INTO STRICT fee FROM public.fee_records WHERE id::text = p_fee_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.fee_year_closures WHERE neighborhood_id=fee.neighborhood_id AND fiscal_year=fee.fiscal_year) THEN
    RAISE EXCEPTION 'Fee year changed; retry through the post-lock payment workflow';
  END IF;
  -- A replay of the pre-migration last payment must not be counted again.
  INSERT INTO public.fee_stripe_payments(stripe_payment_intent_id, fee_record_id, amount)
    VALUES(p_payment_intent, p_fee_id, p_amount) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF EXISTS(SELECT 1 FROM public.fee_stripe_payments WHERE stripe_payment_intent_id=p_payment_intent AND (fee_record_id<>p_fee_id OR amount<>p_amount)) THEN RAISE EXCEPTION 'Payment identity mismatch'; END IF;
  IF inserted_count = 0 OR fee.stripe_payment_intent_id = p_payment_intent THEN RETURN; END IF;
  cash_amount := coalesce(fee.paid_amount_cash, 0);
  stripe_amount := coalesce(fee.paid_amount_stripe, 0) + p_amount;
  billed := coalesce(fee.expected_amount, fee.billing_amount, fee.amount, 0);
  UPDATE public.fee_records SET paid_amount_cash=cash_amount, paid_amount_stripe=stripe_amount,
    paid_amount=cash_amount+stripe_amount, payment_method='stripe', last_payment_method='stripe',
    status=CASE WHEN cash_amount+stripe_amount >= billed THEN 'paid' ELSE 'partial' END,
    stripe_payment_intent_id=p_payment_intent, paid_at=coalesce(fee.paid_at, now()) WHERE id=fee.id;
END $$;
REVOKE ALL ON FUNCTION public.record_stripe_fee_payment(text,text,bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_stripe_fee_payment(text,text,bigint) TO service_role;
COMMENT ON COLUMN public.system_usage_payment_profiles.payment_method IS 'card=Stripeカード自動決済、bank_transfer=Stripe顧客専用口座への銀行振込（自動消込）。発行済みの旧直接振込請求は変更しない。';
NOTIFY pgrst, 'reload schema';
COMMIT;
