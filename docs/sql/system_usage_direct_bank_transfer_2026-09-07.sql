-- 運営側のシステム利用料受取口座。会費受取口座・Stripe Connectとは別管理。
CREATE TABLE IF NOT EXISTS public.system_usage_bank_account (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  bank_name TEXT NOT NULL,
  bank_branch_name TEXT NOT NULL,
  bank_account_type TEXT NOT NULL CHECK (bank_account_type IN ('ordinary', 'checking')),
  bank_account_number TEXT NOT NULL CHECK (bank_account_number ~ '^[0-9]{7}$'),
  bank_account_holder TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.system_usage_bank_account ENABLE ROW LEVEL SECURITY;
-- 公開クライアントからは参照・更新しない。認証済み管理者向けサーバーAPIのみ使用。
REVOKE ALL ON public.system_usage_bank_account FROM anon, authenticated;
GRANT ALL ON public.system_usage_bank_account TO service_role;
ALTER TABLE public.system_usage_billings ADD COLUMN IF NOT EXISTS bank_account_snapshot JSONB;
COMMENT ON COLUMN public.system_usage_billings.bank_account_snapshot IS '銀行口座振込の請求発行時点の運営側振込先。後の口座変更で発行済み請求書は変更しない。';
COMMENT ON COLUMN public.system_usage_payment_profiles.payment_method IS 'card=カード自動決済、bank_transfer=運営側銀行口座へ直接振込。';
NOTIFY pgrst, 'reload schema';
