-- 2026-07-24
-- 世帯主による家族登録・招待URL発行を廃止する。
-- 既存の家族認証、LINE連携、退会状態、会費履歴は変更しない。

BEGIN;

-- 過去に発行された未使用URLをすべて無効化する。
UPDATE public.resident_rosters
SET
  family_invite_token_1 = NULL,
  family_invite_token_2 = NULL,
  family_invited_at_1 = NULL,
  family_invited_at_2 = NULL
WHERE
  family_invite_token_1 IS NOT NULL
  OR family_invite_token_2 IS NOT NULL
  OR family_invited_at_1 IS NOT NULL
  OR family_invited_at_2 IS NOT NULL;

-- 旧画面や保存済みURLからも家族招待を実行できないようにする。
DROP FUNCTION IF EXISTS public.create_resident_family_invite(BIGINT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.claim_resident_family_invite(TEXT, TEXT);

COMMENT ON COLUMN public.resident_rosters.family_invite_token_1 IS
  '廃止済み。2026-07-24以降は家族招待URLを発行しない。';
COMMENT ON COLUMN public.resident_rosters.family_invite_token_2 IS
  '廃止済み。2026-07-24以降は家族招待URLを発行しない。';
COMMENT ON COLUMN public.resident_rosters.family_invited_at_1 IS
  '廃止済み。家族招待URLの旧履歴列。';
COMMENT ON COLUMN public.resident_rosters.family_invited_at_2 IS
  '廃止済み。家族招待URLの旧履歴列。';

COMMIT;
