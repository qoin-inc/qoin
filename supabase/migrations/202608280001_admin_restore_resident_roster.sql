-- 有効な町内会・自治会役員が、自町内会の退会済み世帯を復帰できるようにする。
-- 復帰時は退会状態だけを active へ戻し、退会時に解除したLINE連携は復元しない。

BEGIN;

CREATE OR REPLACE FUNCTION public.guard_resident_roster_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(OLD.withdrawal_status, 'active') = 'withdrawn'
     AND COALESCE(NEW.withdrawal_status, 'active') <> 'withdrawn' THEN
    IF auth.uid() IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.neighborhood_admins AS admins
      WHERE admins.neighborhood_id = OLD.neighborhood_id
        AND admins.admin_auth_id::TEXT = auth.uid()::TEXT
        AND admins.status = 'active'
    ) THEN
      RAISE EXCEPTION '退会済み名簿を復帰できるのは、この町内会・自治会の有効な役員だけです。';
    END IF;

    NEW.withdrawal_status := 'active';
  END IF;

  IF COALESCE(NEW.withdrawal_status, 'active') = 'withdrawn' THEN
    NEW.withdrawal_status := 'withdrawn';
    NEW.user_auth_id := NULL;
    NEW.line_user_id := NULL;
    NEW.family_user_auth_id_1 := NULL;
    NEW.family_line_user_id_1 := NULL;
    NEW.family_user_auth_id_2 := NULL;
    NEW.family_line_user_id_2 := NULL;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_resident_roster_withdrawal() FROM PUBLIC;

COMMENT ON FUNCTION public.guard_resident_roster_withdrawal() IS
  '退会時のLINE連携解除を保証し、有効な町内会・自治会役員による退会済み世帯の復帰だけを許可する。';

NOTIFY pgrst, 'reload schema';

COMMIT;
