-- 2026-07-12
-- 町内会の有効な管理者が、自町内会の会員名簿を登録・更新できるようにするRLSポリシー。
-- Supabase SQL Editorで実行してください。

ALTER TABLE public.resident_rosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resident_rosters_insert_active_admins
ON public.resident_rosters;

CREATE POLICY resident_rosters_insert_active_admins
ON public.resident_rosters
FOR INSERT
TO authenticated
WITH CHECK (
  neighborhood_id IN (
    SELECT admins.neighborhood_id
    FROM public.neighborhood_admins admins
    WHERE admins.admin_auth_id = auth.uid()
      AND admins.status = 'active'
  )
);

DROP POLICY IF EXISTS resident_rosters_update_active_admins
ON public.resident_rosters;

CREATE POLICY resident_rosters_update_active_admins
ON public.resident_rosters
FOR UPDATE
TO authenticated
USING (
  neighborhood_id IN (
    SELECT admins.neighborhood_id
    FROM public.neighborhood_admins admins
    WHERE admins.admin_auth_id = auth.uid()
      AND admins.status = 'active'
  )
)
WITH CHECK (
  neighborhood_id IN (
    SELECT admins.neighborhood_id
    FROM public.neighborhood_admins admins
    WHERE admins.admin_auth_id = auth.uid()
      AND admins.status = 'active'
  )
);

DROP POLICY IF EXISTS resident_rosters_delete_active_admins
ON public.resident_rosters;

CREATE POLICY resident_rosters_delete_active_admins
ON public.resident_rosters
FOR DELETE
TO authenticated
USING (
  neighborhood_id IN (
    SELECT admins.neighborhood_id
    FROM public.neighborhood_admins admins
    WHERE admins.admin_auth_id = auth.uid()
      AND admins.status = 'active'
  )
);

-- 初回LINE連携専用。入力された町内会・郵便番号・住所・本人/家族名が
-- すべて一致した場合だけ、現在ログイン中のauth.uid()を対応枠へ保存する。
-- SECURITY DEFINERにより、resident_rostersの一般UPDATE権限は公開しない。
CREATE OR REPLACE FUNCTION public.link_resident_roster_by_identity(
  p_neighborhood_id BIGINT,
  p_full_name TEXT,
  p_postal_code TEXT,
  p_address2 TEXT,
  p_address3 TEXT DEFAULT '',
  p_line_user_id TEXT DEFAULT NULL,
  p_line_display_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target public.resident_rosters%ROWTYPE;
  normalized_name TEXT := regexp_replace(coalesce(p_full_name, ''), '[[:space:]　]+', '', 'g');
  normalized_postal TEXT := regexp_replace(coalesce(p_postal_code, ''), '[^0-9]', '', 'g');
  normalized_address2 TEXT := regexp_replace(coalesce(p_address2, ''), '[[:space:]　]+', '', 'g');
  normalized_address3 TEXT := regexp_replace(coalesce(p_address3, ''), '[[:space:]　]+', '', 'g');
  matched_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LINE認証が必要です。';
  END IF;

  SELECT * INTO target
  FROM public.resident_rosters roster
  WHERE roster.neighborhood_id = p_neighborhood_id
    AND coalesce(roster.withdrawal_status, 'active') <> 'withdrawn'
    AND regexp_replace(coalesce(roster.postal_code, ''), '[^0-9]', '', 'g') = normalized_postal
    AND regexp_replace(coalesce(roster.address2, ''), '[[:space:]　]+', '', 'g') = normalized_address2
    AND regexp_replace(coalesce(roster.address3, ''), '[[:space:]　]+', '', 'g') = normalized_address3
    AND normalized_name IN (
      regexp_replace(coalesce(roster.full_name, ''), '[[:space:]　]+', '', 'g'),
      regexp_replace(coalesce(roster.family_name_1, ''), '[[:space:]　]+', '', 'g'),
      regexp_replace(coalesce(roster.family_name_2, ''), '[[:space:]　]+', '', 'g')
    )
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '入力内容に一致する有効な会員名簿が見つかりません。';
  END IF;

  IF regexp_replace(coalesce(target.full_name, ''), '[[:space:]　]+', '', 'g') = normalized_name THEN
    IF target.user_auth_id IS NOT NULL AND target.user_auth_id <> auth.uid()::TEXT THEN
      RAISE EXCEPTION 'この会員名簿はすでに別のLINEアカウントと連携済みです。';
    END IF;
    UPDATE public.resident_rosters SET
      user_auth_id = auth.uid()::TEXT,
      line_user_id = coalesce(p_line_user_id, line_user_id)
    WHERE id = target.id;
    matched_role := 'primary';
  ELSIF regexp_replace(coalesce(target.family_name_1, ''), '[[:space:]　]+', '', 'g') = normalized_name THEN
    IF target.family_user_auth_id_1 IS NOT NULL AND target.family_user_auth_id_1 <> auth.uid()::TEXT THEN
      RAISE EXCEPTION 'この家族名はすでに別のLINEアカウントと連携済みです。';
    END IF;
    UPDATE public.resident_rosters SET
      family_user_auth_id_1 = auth.uid()::TEXT,
      family_line_user_id_1 = coalesce(p_line_user_id, family_line_user_id_1)
    WHERE id = target.id;
    matched_role := 'family1';
  ELSE
    IF target.family_user_auth_id_2 IS NOT NULL AND target.family_user_auth_id_2 <> auth.uid()::TEXT THEN
      RAISE EXCEPTION 'この家族名はすでに別のLINEアカウントと連携済みです。';
    END IF;
    UPDATE public.resident_rosters SET
      family_user_auth_id_2 = auth.uid()::TEXT,
      family_line_user_id_2 = coalesce(p_line_user_id, family_line_user_id_2)
    WHERE id = target.id;
    matched_role := 'family2';
  END IF;

  RETURN jsonb_build_object('roster_id', target.id, 'role', matched_role);
END;
$$;

REVOKE ALL ON FUNCTION public.link_resident_roster_by_identity(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_resident_roster_by_identity(BIGINT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
