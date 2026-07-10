-- 2026-07-06
-- 新規の町内会・自治会登録フォームで保存する追加項目。
-- Supabase SQL Editorで実行してください。既存列がある場合は追加されません。

ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS households INTEGER,
  ADD COLUMN IF NOT EXISTS member_scale TEXT;

ALTER TABLE public.neighborhood_admins
  ADD COLUMN IF NOT EXISTS admin_role TEXT;

COMMENT ON COLUMN public.neighborhoods.postal_code IS '町内会・自治会の郵便番号。';
COMMENT ON COLUMN public.neighborhoods.households IS '旧数値入力用の町内会規模・会員数規模。';
COMMENT ON COLUMN public.neighborhoods.member_scale IS '会員世帯数規模。例: 500世帯未満、500世帯～1000世帯、1000世帯～5000世帯、5000世帯以上。';
COMMENT ON COLUMN public.neighborhood_admins.admin_role IS '役員の役職。例: 会長、副会長、会計。';
