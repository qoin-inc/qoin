-- 世帯主による家族追加（最大2名）と、家族単独退会のための追加SQL
-- 家族は名簿照合を行わず、世帯主が発行した一度限りの招待URLから連携する。

ALTER TABLE public.resident_rosters
  ADD COLUMN IF NOT EXISTS family_invite_token_1 TEXT,
  ADD COLUMN IF NOT EXISTS family_invite_token_2 TEXT,
  ADD COLUMN IF NOT EXISTS family_invited_at_1 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS family_invited_at_2 TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS family_withdrawal_status_1 TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS family_withdrawal_status_2 TEXT DEFAULT 'active';

CREATE UNIQUE INDEX IF NOT EXISTS resident_rosters_family_invite_token_1_key
  ON public.resident_rosters (family_invite_token_1) WHERE family_invite_token_1 IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS resident_rosters_family_invite_token_2_key
  ON public.resident_rosters (family_invite_token_2) WHERE family_invite_token_2 IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_resident_family_invite(
  p_roster_id BIGINT,
  p_slot INTEGER,
  p_family_name TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.resident_rosters%ROWTYPE;
  token TEXT := gen_random_uuid()::TEXT;
BEGIN
  IF p_slot NOT IN (1, 2) THEN RAISE EXCEPTION '家族枠が正しくありません。'; END IF;
  IF NULLIF(BTRIM(p_family_name), '') IS NULL THEN RAISE EXCEPTION '家族の氏名を入力してください。'; END IF;

  SELECT * INTO target FROM public.resident_rosters WHERE id = p_roster_id FOR UPDATE;
  IF NOT FOUND OR target.user_auth_id::TEXT <> auth.uid()::TEXT THEN
    RAISE EXCEPTION '世帯主本人だけが家族を追加できます。';
  END IF;
  IF COALESCE(target.withdrawal_status, 'active') = 'withdrawn' THEN
    RAISE EXCEPTION '退会済みの世帯には家族を追加できません。';
  END IF;

  IF p_slot = 1 THEN
    IF target.family_user_auth_id_1 IS NOT NULL THEN RAISE EXCEPTION '家族1はすでに連携済みです。'; END IF;
    UPDATE public.resident_rosters SET
      family_name_1 = BTRIM(p_family_name), family_invite_token_1 = token,
      family_invited_at_1 = NOW(), family_withdrawal_status_1 = 'active'
    WHERE id = p_roster_id;
  ELSE
    IF target.family_user_auth_id_2 IS NOT NULL THEN RAISE EXCEPTION '家族2はすでに連携済みです。'; END IF;
    UPDATE public.resident_rosters SET
      family_name_2 = BTRIM(p_family_name), family_invite_token_2 = token,
      family_invited_at_2 = NOW(), family_withdrawal_status_2 = 'active'
    WHERE id = p_roster_id;
  END IF;
  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_resident_family_invite(
  p_token TEXT,
  p_line_user_id TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target public.resident_rosters%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LINEログインが必要です。'; END IF;
  SELECT * INTO target FROM public.resident_rosters
    WHERE family_invite_token_1 = p_token OR family_invite_token_2 = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '家族招待URLが無効か、すでに使用済みです。'; END IF;
  IF COALESCE(target.withdrawal_status, 'active') = 'withdrawn' THEN RAISE EXCEPTION '退会済みの世帯です。'; END IF;
  IF target.user_auth_id::TEXT = auth.uid()::TEXT THEN RAISE EXCEPTION '世帯主と同じLINEアカウントは家族登録できません。'; END IF;

  IF target.family_invite_token_1 = p_token THEN
    UPDATE public.resident_rosters SET family_user_auth_id_1 = auth.uid()::TEXT,
      family_line_user_id_1 = COALESCE(p_line_user_id, family_line_user_id_1),
      family_invite_token_1 = NULL, family_withdrawal_status_1 = 'active' WHERE id = target.id;
  ELSE
    UPDATE public.resident_rosters SET family_user_auth_id_2 = auth.uid()::TEXT,
      family_line_user_id_2 = COALESCE(p_line_user_id, family_line_user_id_2),
      family_invite_token_2 = NULL, family_withdrawal_status_2 = 'active' WHERE id = target.id;
  END IF;
  RETURN target.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_resident_family_invite(BIGINT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_resident_family_invite(TEXT, TEXT) TO authenticated;

COMMENT ON COLUMN public.resident_rosters.family_withdrawal_status_1 IS '家族1固有の退会状態。世帯主の状態とは独立。';
COMMENT ON COLUMN public.resident_rosters.family_withdrawal_status_2 IS '家族2固有の退会状態。世帯主の状態とは独立。';

-- 通常の名簿照合は世帯主だけに限定する。家族は claim_resident_family_invite を使用する。
CREATE OR REPLACE FUNCTION public.link_resident_roster_by_identity(
  p_neighborhood_id BIGINT, p_full_name TEXT, p_kana_name TEXT, p_postal_code TEXT,
  p_address2 TEXT, p_address3 TEXT DEFAULT '', p_line_user_id TEXT DEFAULT NULL,
  p_line_display_name TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target public.resident_rosters%ROWTYPE;
  normalized_name TEXT := regexp_replace(COALESCE(p_full_name, ''), '[[:space:]　]+', '', 'g');
  normalized_kana TEXT := regexp_replace(COALESCE(p_kana_name, ''), '[[:space:]　]+', '', 'g');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LINE認証が必要です。'; END IF;
  SELECT * INTO target FROM public.resident_rosters roster
  WHERE roster.neighborhood_id = p_neighborhood_id
    AND COALESCE(roster.withdrawal_status, 'active') <> 'withdrawn'
    AND regexp_replace(COALESCE(roster.postal_code, ''), '[^0-9]', '', 'g') = regexp_replace(COALESCE(p_postal_code, ''), '[^0-9]', '', 'g')
    AND regexp_replace(COALESCE(roster.address2, ''), '[[:space:]　]+', '', 'g') = regexp_replace(COALESCE(p_address2, ''), '[[:space:]　]+', '', 'g')
    AND regexp_replace(COALESCE(roster.address3, ''), '[[:space:]　]+', '', 'g') = regexp_replace(COALESCE(p_address3, ''), '[[:space:]　]+', '', 'g')
    AND regexp_replace(COALESCE(roster.full_name, ''), '[[:space:]　]+', '', 'g') = normalized_name
    AND regexp_replace(COALESCE(roster.kana_name, ''), '[[:space:]　]+', '', 'g') = normalized_kana
  LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION '入力内容に一致する世帯主の会員名簿が見つかりません。'; END IF;
  IF target.user_auth_id IS NOT NULL AND target.user_auth_id <> auth.uid() THEN
    RAISE EXCEPTION 'この会員名簿はすでに別のLINEアカウントと連携済みです。';
  END IF;
  UPDATE public.resident_rosters SET user_auth_id = auth.uid(),
    line_user_id = COALESCE(p_line_user_id, line_user_id) WHERE id = target.id;
  RETURN jsonb_build_object('roster_id', target.id, 'role', 'primary');
END;
$$;
