-- 管理機能 > 基本機能 > 基本情報 用の追加カラム
-- Supabase SQL Editor で実行してください。

ALTER TABLE public.neighborhoods
  ADD COLUMN IF NOT EXISTS fiscal_start_month INTEGER DEFAULT 4 CHECK (fiscal_start_month >= 1 AND fiscal_start_month <= 12),
  ADD COLUMN IF NOT EXISTS households INTEGER,
  ADD COLUMN IF NOT EXISTS member_scale TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

COMMENT ON COLUMN public.neighborhoods.fiscal_start_month IS '会計年度の開始月。画面では決算月を入力し、翌月を開始月として保存する。';
COMMENT ON COLUMN public.neighborhoods.households IS '旧数値入力用の会員数規模・世帯数規模。';
COMMENT ON COLUMN public.neighborhoods.member_scale IS '会員世帯数規模。例: 500世帯未満、500世帯～1000世帯、1000世帯～5000世帯、5000世帯以上。';
COMMENT ON COLUMN public.neighborhoods.postal_code IS '町内会・自治会の郵便番号。';
