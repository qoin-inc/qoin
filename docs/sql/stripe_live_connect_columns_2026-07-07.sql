-- Stripe連携を町内会・自治会の本番登録前提で扱うための追加SQL
-- Supabase SQL Editorで実行してください。

ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS stripe_account_mode TEXT DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS stripe_onboarding_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_account_updated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.neighborhoods.stripe_account_mode IS 'Stripe Connectアカウントのモード。町内会・自治会の運用はliveを使用する。testはel-town内部検証用。';
COMMENT ON COLUMN public.neighborhoods.stripe_onboarding_status IS 'Stripe本番登録の状態。pending/reviewing/activeなど。';
COMMENT ON COLUMN public.neighborhoods.stripe_charges_enabled IS 'Stripe側で決済受付が有効かどうか。';
COMMENT ON COLUMN public.neighborhoods.stripe_payouts_enabled IS 'Stripe側で入金/振込が有効かどうか。';
COMMENT ON COLUMN public.neighborhoods.stripe_details_submitted IS 'Stripeオンボーディング情報が提出済みかどうか。';
COMMENT ON COLUMN public.neighborhoods.stripe_account_updated_at IS 'Stripeアカウント状態を最後に反映した日時。';
