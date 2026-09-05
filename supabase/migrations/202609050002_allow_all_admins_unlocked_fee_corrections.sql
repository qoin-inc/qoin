-- 確定解除後の会費個別訂正を、対象団体の役員全員に許可する。
-- 年度の確定解除と再確定は、従来どおり代表者またはシステム権限者に限定する。

CREATE OR REPLACE FUNCTION public.guard_finalized_fee_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_closure public.fee_year_closures;
  new_closure public.fee_year_closures;
  only_roster_detached BOOLEAN := FALSE;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT * INTO old_closure
    FROM public.fee_year_closures
    WHERE neighborhood_id = OLD.neighborhood_id AND fiscal_year = OLD.fiscal_year;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    only_roster_detached := OLD.roster_id IS NOT NULL
      AND NEW.roster_id IS NULL
      AND (to_jsonb(NEW) - 'roster_id') = (to_jsonb(OLD) - 'roster_id');
  END IF;

  IF only_roster_detached THEN RETURN NEW; END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT * INTO new_closure
    FROM public.fee_year_closures
    WHERE neighborhood_id = NEW.neighborhood_id AND fiscal_year = NEW.fiscal_year;
  END IF;

  IF old_closure.status = 'locked' OR new_closure.status = 'locked' THEN
    RAISE EXCEPTION '確定済み年度の会費は変更できません。代表者が確定を解除してください。';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_finalized_fee_record()
IS '確定済み年度の会費変更を禁止する。代表者による確定解除後は、RLSで許可された役員全員が訂正可能。';
