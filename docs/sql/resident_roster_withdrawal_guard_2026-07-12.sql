-- 退会処理をDBでも保証する。
-- 1. 退会確定時に本人・家族の認証/LINE連携を必ず解除する。
-- 2. 退会済み状態から通常のUPDATEで復活できないようにする。
-- 再入会が必要になった場合は、本人確認を含む専用の再入会手続きを別途実装する。

CREATE OR REPLACE FUNCTION public.guard_resident_roster_withdrawal()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(OLD.withdrawal_status, 'active') = 'withdrawn'
     AND coalesce(NEW.withdrawal_status, 'active') <> 'withdrawn' THEN
    RAISE EXCEPTION '退会済み名簿は通常操作では復活できません。正式な再入会手続きを行ってください。';
  END IF;

  IF coalesce(NEW.withdrawal_status, 'active') = 'withdrawn' THEN
    NEW.withdrawal_status := 'withdrawn';
    NEW.status := 'withdrawn';
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

DROP TRIGGER IF EXISTS resident_roster_withdrawal_guard ON public.resident_rosters;
CREATE TRIGGER resident_roster_withdrawal_guard
BEFORE UPDATE OF withdrawal_status ON public.resident_rosters
FOR EACH ROW
EXECUTE FUNCTION public.guard_resident_roster_withdrawal();

COMMENT ON FUNCTION public.guard_resident_roster_withdrawal() IS
  '退会時の認証/LINE連携解除と、通常UPDATEによる退会取消し禁止を保証する。';
