-- システム利用料振込先の金融機関コード・支店コードを追加。
-- 既存口座と発行済み請求データは変更しない。
ALTER TABLE public.system_usage_bank_account
  ADD COLUMN IF NOT EXISTS bank_code TEXT CHECK (bank_code IS NULL OR bank_code ~ '^[0-9]{4}$'),
  ADD COLUMN IF NOT EXISTS bank_branch_code TEXT CHECK (bank_branch_code IS NULL OR bank_branch_code ~ '^[0-9]{3}$');
COMMENT ON COLUMN public.system_usage_bank_account.bank_code IS '金融機関コード4桁。先頭の0を保持する。';
COMMENT ON COLUMN public.system_usage_bank_account.bank_branch_code IS '支店コード3桁。先頭の0を保持する。';
NOTIFY pgrst, 'reload schema';
