-- 2026-07-06
-- 会員管理のCSV取込み/画面入力/退会承認で利用する名簿項目。
-- Supabase SQL Editorで実行してください。既存列がある場合は追加されません。

ALTER TABLE public.resident_rosters
  ADD COLUMN IF NOT EXISTS kana_name TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS address_line3 TEXT,
  ADD COLUMN IF NOT EXISTS family_name_1 TEXT,
  ADD COLUMN IF NOT EXISTS family_name_2 TEXT,
  ADD COLUMN IF NOT EXISTS family_user_auth_id_1 TEXT,
  ADD COLUMN IF NOT EXISTS family_user_auth_id_2 TEXT,
  ADD COLUMN IF NOT EXISTS withdrawal_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS withdrawal_reply_message TEXT;

-- full_name を正規の表示名として使う現行画面との互換用。
-- 旧スキーマで last_name が NOT NULL の場合も、未指定の INSERT を許可する。
ALTER TABLE public.resident_rosters
  ALTER COLUMN last_name SET DEFAULT '';

COMMENT ON COLUMN public.resident_rosters.kana_name IS '氏名カタカナ。初回LINE連携時の照合情報。';
COMMENT ON COLUMN public.resident_rosters.postal_code IS '会員住所の郵便番号。初回LINE連携時の照合情報。';
COMMENT ON COLUMN public.resident_rosters.address_line2 IS '住所２。';
COMMENT ON COLUMN public.resident_rosters.address_line3 IS '住所３。';
COMMENT ON COLUMN public.resident_rosters.family_name_1 IS '同一世帯の家族1名目。';
COMMENT ON COLUMN public.resident_rosters.family_name_2 IS '同一世帯の家族2名目。';
COMMENT ON COLUMN public.resident_rosters.withdrawal_status IS 'active/requested/withdrawn等の退会状態。withdrawnは同じ町内会・自治会でel-town利用不可。';
COMMENT ON COLUMN public.resident_rosters.withdrawal_reply_message IS '退会承認または復活時に会員へ返信する文面。';
