-- 管理機能 > 役員管理 > 招待URL・退任/復活 用の追加SQL
-- Supabase SQL Editor で実行してください。

ALTER TABLE public.neighborhood_admins
  ADD COLUMN IF NOT EXISTS admin_role TEXT,
  ADD COLUMN IF NOT EXISTS admin_invite_token TEXT,
  ADD COLUMN IF NOT EXISTS invite_token TEXT,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS retired_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.neighborhood_admins DROP CONSTRAINT IF EXISTS neighborhood_admins_status_check;
ALTER TABLE public.neighborhood_admins
  ADD CONSTRAINT neighborhood_admins_status_check
  CHECK (status IN ('pending', 'active', 'waiting_approval', 'rejected', 'retired'));

COMMENT ON COLUMN public.neighborhood_admins.admin_role IS '役員の役職。例: 会長、副会長、会計。';
COMMENT ON COLUMN public.neighborhood_admins.admin_invite_token IS '役員候補者ごとの招待URL用トークン。候補者が認証して参加するとNULLに戻す。';
COMMENT ON COLUMN public.neighborhood_admins.invite_token IS '旧/互換用の役員招待トークン。admin_invite_tokenと同じ値を保存する。';
COMMENT ON COLUMN public.neighborhood_admins.invited_at IS '役員候補者へ招待URLを作成した日時。';
COMMENT ON COLUMN public.neighborhood_admins.retired_at IS '役員が退任した日時。復活時はNULLに戻す。';

-- 退任済みメールアドレスを他の町内会・自治会で使えるようにするため、
-- もしメール/認証ID単体のユニーク制約がある場合は解除し、町内会単位・有効役員単位の重複防止へ寄せます。
ALTER TABLE public.neighborhood_admins DROP CONSTRAINT IF EXISTS neighborhood_admins_admin_email_key;
ALTER TABLE public.neighborhood_admins DROP CONSTRAINT IF EXISTS neighborhood_admins_admin_auth_id_key;
DROP INDEX IF EXISTS public.neighborhood_admins_admin_email_key;
DROP INDEX IF EXISTS public.neighborhood_admins_admin_auth_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS neighborhood_admins_active_email_per_town_key
  ON public.neighborhood_admins (neighborhood_id, lower(admin_email))
  WHERE status NOT IN ('retired', 'rejected');

CREATE UNIQUE INDEX IF NOT EXISTS neighborhood_admins_invite_token_key
  ON public.neighborhood_admins (admin_invite_token)
  WHERE admin_invite_token IS NOT NULL;
