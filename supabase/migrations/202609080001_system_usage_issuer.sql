BEGIN;
ALTER TABLE public.system_usage_bank_account ADD COLUMN IF NOT EXISTS issuer JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.system_usage_billings ADD COLUMN IF NOT EXISTS issuer_snapshot JSONB;
COMMENT ON COLUMN public.system_usage_bank_account.issuer IS '請求書・領収書の発行元。郵便番号、住所、会社名、電話番号、適格請求書発行事業者登録番号。';
COMMENT ON COLUMN public.system_usage_billings.issuer_snapshot IS '請求発行時の発行元。発行済み請求書・領収書では現在の設定で上書きしない。';
NOTIFY pgrst, 'reload schema';
COMMIT;
