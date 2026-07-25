ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS stripe_paypay_status TEXT NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS stripe_paypay_last_error TEXT,
  ADD COLUMN IF NOT EXISTS stripe_paypay_updated_at TIMESTAMPTZ;

ALTER TABLE public.neighborhoods
  DROP CONSTRAINT IF EXISTS neighborhoods_stripe_paypay_status_check;
ALTER TABLE public.neighborhoods
  ADD CONSTRAINT neighborhoods_stripe_paypay_status_check
  CHECK (stripe_paypay_status IN ('not_requested', 'pending', 'active', 'inactive', 'restricted'));

ALTER TABLE public.neighborhood_fee_settings
  ADD COLUMN IF NOT EXISTS stripe_paypay_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.neighborhood_fee_settings
  DROP CONSTRAINT IF EXISTS neighborhood_fee_settings_paypay_details_check;

ALTER TABLE public.neighborhood_fee_settings
  DROP CONSTRAINT IF EXISTS neighborhood_fee_settings_payment_method_check;
ALTER TABLE public.neighborhood_fee_settings
  ADD CONSTRAINT neighborhood_fee_settings_payment_method_check
  CHECK (cash_enabled OR stripe_card_enabled OR bank_transfer_enabled OR stripe_paypay_enabled);

COMMENT ON COLUMN public.neighborhood_fee_settings.stripe_paypay_enabled
  IS 'Stripe ConnectのPayPay capabilityが有効で、運営承認済みの場合にtrue。会員画面のCheckout表示に使用する。';
COMMENT ON COLUMN public.neighborhood_fee_settings.paypay_enabled
  IS '旧外部PayPay案内用。Stripe PayPayでは使用しない。';
COMMENT ON COLUMN public.neighborhood_fee_settings.paypay_payment_url
  IS '旧外部PayPay案内URL。Stripe PayPayでは使用しない。';

CREATE TABLE IF NOT EXISTS public.neighborhood_commercial_disclosures (
  neighborhood_id BIGINT PRIMARY KEY REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
  publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'withdrawn')),
  seller_name TEXT NOT NULL,
  representative_name TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  fee_name TEXT NOT NULL,
  fee_amount INTEGER NOT NULL CHECK (fee_amount >= 0),
  additional_fees TEXT NOT NULL,
  payment_methods TEXT NOT NULL,
  payment_timing TEXT NOT NULL,
  service_timing TEXT NOT NULL,
  application_period TEXT NOT NULL,
  cancellation_refund TEXT NOT NULL,
  business_hours TEXT,
  published_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.neighborhood_payment_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood_id BIGINT NOT NULL REFERENCES public.neighborhoods(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('enable_paypay', 'update_paypay', 'disable_paypay')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  requested_by UUID,
  reviewed_by TEXT,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS neighborhood_payment_change_requests_one_pending
  ON public.neighborhood_payment_change_requests(neighborhood_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS neighborhood_payment_change_requests_status_created
  ON public.neighborhood_payment_change_requests(status, created_at DESC);

ALTER TABLE public.neighborhood_commercial_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.neighborhood_payment_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published commercial disclosures"
  ON public.neighborhood_commercial_disclosures;
CREATE POLICY "Public can read published commercial disclosures"
  ON public.neighborhood_commercial_disclosures
  FOR SELECT
  USING (publication_status = 'published');

GRANT SELECT ON public.neighborhood_commercial_disclosures TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
