-- 2026-07-10
-- LINEプッシュ通知で利用するLINEユーザーID保存カラム。
-- user_auth_id はSupabase Auth IDとして残し、LINE Messaging APIの送信先は下記カラムを利用します。

ALTER TABLE public.resident_rosters
  ADD COLUMN IF NOT EXISTS line_user_id TEXT,
  ADD COLUMN IF NOT EXISTS family_line_user_id_1 TEXT,
  ADD COLUMN IF NOT EXISTS family_line_user_id_2 TEXT;

CREATE INDEX IF NOT EXISTS resident_rosters_line_user_id_idx
  ON public.resident_rosters(line_user_id);

CREATE INDEX IF NOT EXISTS resident_rosters_family_line_user_id_1_idx
  ON public.resident_rosters(family_line_user_id_1);

CREATE INDEX IF NOT EXISTS resident_rosters_family_line_user_id_2_idx
  ON public.resident_rosters(family_line_user_id_2);

COMMENT ON COLUMN public.resident_rosters.line_user_id IS '本人のLINE Messaging API送信用ユーザーID。';
COMMENT ON COLUMN public.resident_rosters.family_line_user_id_1 IS '家族1のLINE Messaging API送信用ユーザーID。';
COMMENT ON COLUMN public.resident_rosters.family_line_user_id_2 IS '家族2のLINE Messaging API送信用ユーザーID。';
