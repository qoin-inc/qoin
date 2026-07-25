-- 町内会・自治会ごとの会費受取方法と支払い案内
-- 既存行は変更せず、新しい決済方法は初期状態で無効にする。

ALTER TABLE public.neighborhood_fee_settings
  ADD COLUMN IF NOT EXISTS bank_transfer_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS paypay_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_type TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_holder TEXT,
  ADD COLUMN IF NOT EXISTS paypay_display_name TEXT,
  ADD COLUMN IF NOT EXISTS paypay_payment_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_instructions TEXT;

ALTER TABLE public.neighborhood_fee_settings
  DROP CONSTRAINT IF EXISTS neighborhood_fee_settings_bank_account_type_check;

ALTER TABLE public.neighborhood_fee_settings
  ADD CONSTRAINT neighborhood_fee_settings_bank_account_type_check
  CHECK (bank_account_type IS NULL OR bank_account_type IN ('ordinary', 'checking'));

ALTER TABLE public.neighborhood_fee_settings
  DROP CONSTRAINT IF EXISTS neighborhood_fee_settings_payment_method_check;

ALTER TABLE public.neighborhood_fee_settings
  ADD CONSTRAINT neighborhood_fee_settings_payment_method_check
  CHECK (cash_enabled OR stripe_card_enabled OR bank_transfer_enabled OR paypay_enabled);

ALTER TABLE public.neighborhood_fee_settings
  DROP CONSTRAINT IF EXISTS neighborhood_fee_settings_bank_details_check;

ALTER TABLE public.neighborhood_fee_settings
  ADD CONSTRAINT neighborhood_fee_settings_bank_details_check
  CHECK (
    NOT bank_transfer_enabled
    OR (
      NULLIF(BTRIM(bank_name), '') IS NOT NULL
      AND NULLIF(BTRIM(bank_branch_name), '') IS NOT NULL
      AND bank_account_type IS NOT NULL
      AND NULLIF(BTRIM(bank_account_number), '') IS NOT NULL
      AND NULLIF(BTRIM(bank_account_holder), '') IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE public.neighborhood_fee_settings
  DROP CONSTRAINT IF EXISTS neighborhood_fee_settings_paypay_details_check;

ALTER TABLE public.neighborhood_fee_settings
  ADD CONSTRAINT neighborhood_fee_settings_paypay_details_check
  CHECK (
    NOT paypay_enabled
    OR (
      NULLIF(BTRIM(paypay_display_name), '') IS NOT NULL
      AND paypay_payment_url ~ '^https://'
    )
  ) NOT VALID;

COMMENT ON COLUMN public.neighborhood_fee_settings.bank_transfer_enabled
  IS '団体が会費の直接口座振込を受け付ける場合にtrue。Stripeの入金先口座とは別。';
COMMENT ON COLUMN public.neighborhood_fee_settings.paypay_enabled
  IS '団体が会費のPayPay支払い案内を表示する場合にtrue。';
COMMENT ON COLUMN public.neighborhood_fee_settings.bank_account_number
  IS '会員へ案内する団体の会費受取口座番号。RLSにより同一団体の会員と役員だけが参照する。';
COMMENT ON COLUMN public.neighborhood_fee_settings.paypay_payment_url
  IS '団体が用意したPayPay決済案内URL。';
COMMENT ON COLUMN public.neighborhood_fee_settings.payment_instructions
  IS '会員へ表示する団体独自の支払期限・注意事項。';

NOTIFY pgrst, 'reload schema';
