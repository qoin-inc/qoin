-- 会費年度の確定、独立スナップショット、代表者による訂正履歴。

BEGIN;

CREATE TABLE IF NOT EXISTS public.fee_year_closures (
  id BIGSERIAL PRIMARY KEY,
  neighborhood_id BIGINT NOT NULL REFERENCES public.neighborhoods(id) ON DELETE RESTRICT,
  fiscal_year INTEGER NOT NULL CHECK (fiscal_year BETWEEN 2000 AND 2200),
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  unlocked_at TIMESTAMPTZ,
  unlocked_by UUID,
  unlock_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (neighborhood_id, fiscal_year)
);

CREATE TABLE IF NOT EXISTS public.fee_year_snapshot_rows (
  id BIGSERIAL PRIMARY KEY,
  closure_id BIGINT NOT NULL REFERENCES public.fee_year_closures(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  fee_record_id TEXT NOT NULL,
  neighborhood_id BIGINT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  roster_id_snapshot TEXT,
  resident_name TEXT NOT NULL,
  resident_kana TEXT,
  postal_code TEXT,
  address_text TEXT,
  billing_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  paid_amount_cash INTEGER NOT NULL DEFAULT 0,
  paid_amount_stripe INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT,
  fee_data JSONB NOT NULL,
  member_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_by UUID,
  UNIQUE (closure_id, revision, fee_record_id)
);

CREATE TABLE IF NOT EXISTS public.fee_year_lock_events (
  id BIGSERIAL PRIMARY KEY,
  closure_id BIGINT NOT NULL REFERENCES public.fee_year_closures(id) ON DELETE RESTRICT,
  neighborhood_id BIGINT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  revision INTEGER NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('locked', 'unlocked', 'relocked')),
  reason TEXT,
  actor_auth_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fee_record_correction_audit (
  id BIGSERIAL PRIMARY KEY,
  closure_id BIGINT NOT NULL REFERENCES public.fee_year_closures(id) ON DELETE RESTRICT,
  neighborhood_id BIGINT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fee_record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  actor_auth_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fee_year_post_lock_payments (
  id BIGSERIAL PRIMARY KEY,
  closure_id BIGINT NOT NULL REFERENCES public.fee_year_closures(id) ON DELETE RESTRICT,
  neighborhood_id BIGINT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  fee_record_id TEXT NOT NULL,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'reviewed')),
  payment_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stripe_checkout_session_id),
  UNIQUE (stripe_payment_intent_id)
);

CREATE INDEX IF NOT EXISTS fee_year_snapshot_lookup
  ON public.fee_year_snapshot_rows (neighborhood_id, fiscal_year, revision);
CREATE INDEX IF NOT EXISTS fee_record_correction_audit_lookup
  ON public.fee_record_correction_audit (neighborhood_id, fiscal_year, fee_record_id, created_at DESC);

ALTER TABLE public.fee_records
  ADD COLUMN IF NOT EXISTS roster_id_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS member_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB;

UPDATE public.fee_records AS fee
SET
  roster_id_snapshot = COALESCE(fee.roster_id_snapshot, fee.roster_id::TEXT),
  member_snapshot = CASE
    WHEN fee.member_snapshot = '{}'::JSONB AND roster.id IS NOT NULL THEN to_jsonb(roster)
    ELSE fee.member_snapshot
  END
FROM public.resident_rosters AS roster
WHERE fee.roster_id = roster.id;

ALTER TABLE public.fee_records
  DROP CONSTRAINT IF EXISTS fee_records_roster_id_fkey;
ALTER TABLE public.fee_records
  ALTER COLUMN roster_id DROP NOT NULL;
ALTER TABLE public.fee_records
  ADD CONSTRAINT fee_records_roster_id_fkey
    FOREIGN KEY (roster_id) REFERENCES public.resident_rosters(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS public.fee_records_roster_year_unique;
CREATE UNIQUE INDEX fee_records_roster_year_unique
  ON public.fee_records (neighborhood_id, roster_id_snapshot, fiscal_year)
  WHERE roster_id_snapshot IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fee_actor_is_admin(target_neighborhood_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.neighborhood_admins AS admins
    WHERE admins.neighborhood_id = target_neighborhood_id
      AND admins.status = 'active'
      AND (
        admins.admin_auth_id::TEXT = auth.uid()::TEXT
        OR lower(admins.admin_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.neighborhoods AS town
    WHERE town.id = target_neighborhood_id
      AND town.admin_auth_id::TEXT = auth.uid()::TEXT
  );
$$;

CREATE OR REPLACE FUNCTION public.fee_actor_is_representative(target_neighborhood_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.neighborhoods AS town
    WHERE town.id = target_neighborhood_id
      AND (
        town.admin_auth_id::TEXT = auth.uid()::TEXT
        OR lower(town.admin_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.set_fee_record_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  roster public.resident_rosters;
  snapshot_name TEXT;
BEGIN
  IF NEW.roster_id IS NULL THEN
    IF TG_OP = 'UPDATE' AND OLD.roster_id IS NOT NULL THEN
      NEW.neighborhood_id := OLD.neighborhood_id;
      NEW.resident_name := OLD.resident_name;
      NEW.full_name := OLD.full_name;
      NEW.roster_id_snapshot := COALESCE(OLD.roster_id_snapshot, OLD.roster_id::TEXT);
      NEW.member_snapshot := OLD.member_snapshot;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION '会費請求には対象世帯の名簿IDが必要です。';
  END IF;

  SELECT * INTO roster FROM public.resident_rosters WHERE id = NEW.roster_id;
  IF roster.id IS NULL THEN
    RAISE EXCEPTION '対象世帯の名簿が存在しません。';
  END IF;

  snapshot_name := COALESCE(
    NULLIF(btrim(roster.full_name), ''),
    NULLIF(btrim(concat_ws(' ', roster.last_name, roster.first_name)), ''),
    '名称未設定'
  );

  NEW.neighborhood_id := roster.neighborhood_id;
  NEW.resident_name := snapshot_name;
  NEW.full_name := snapshot_name;
  NEW.roster_id_snapshot := COALESCE(NEW.roster_id_snapshot, NEW.roster_id::TEXT);
  NEW.member_snapshot := to_jsonb(roster);
  NEW.fiscal_year := COALESCE(NEW.fiscal_year, NEW.year);
  NEW.year := COALESCE(NEW.year, NEW.fiscal_year);
  NEW.expected_amount := COALESCE(NEW.expected_amount, NEW.billing_amount, NEW.amount);
  NEW.billing_amount := COALESCE(NEW.billing_amount, NEW.expected_amount);
  NEW.amount := COALESCE(NEW.amount, NEW.expected_amount);

  IF NEW.neighborhood_id IS NULL THEN RAISE EXCEPTION '対象世帯に町内会・自治会が設定されていません。'; END IF;
  IF NEW.fiscal_year IS NULL THEN RAISE EXCEPTION '会費請求には会計年度が必要です。'; END IF;
  IF NEW.expected_amount IS NULL THEN RAISE EXCEPTION '会費請求には請求額が必要です。'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fee_records_set_identity ON public.fee_records;
CREATE TRIGGER fee_records_set_identity
BEFORE INSERT OR UPDATE OF roster_id ON public.fee_records
FOR EACH ROW EXECUTE FUNCTION public.set_fee_record_identity();

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

  IF (
    old_closure.status = 'unlocked' AND NOT public.fee_actor_is_representative(old_closure.neighborhood_id)
  ) OR (
    new_closure.status = 'unlocked' AND NOT public.fee_actor_is_representative(new_closure.neighborhood_id)
  ) THEN
    RAISE EXCEPTION '確定解除後の会費訂正は代表者だけが実行できます。';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fee_records_guard_finalized ON public.fee_records;
DROP TRIGGER IF EXISTS fee_records_z_guard_finalized ON public.fee_records;
CREATE TRIGGER fee_records_z_guard_finalized
BEFORE INSERT OR UPDATE OR DELETE ON public.fee_records
FOR EACH ROW EXECUTE FUNCTION public.guard_finalized_fee_record();

CREATE OR REPLACE FUNCTION public.audit_fee_record_correction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_neighborhood_id BIGINT := COALESCE(NEW.neighborhood_id, OLD.neighborhood_id);
  target_fiscal_year INTEGER := COALESCE(NEW.fiscal_year, OLD.fiscal_year);
  target_fee_record_id TEXT := COALESCE(NEW.id::TEXT, OLD.id::TEXT);
  closure public.fee_year_closures;
BEGIN
  SELECT * INTO closure FROM public.fee_year_closures
  WHERE neighborhood_id = target_neighborhood_id AND fiscal_year = target_fiscal_year;
  IF closure.id IS NOT NULL AND closure.status = 'unlocked' THEN
    INSERT INTO public.fee_record_correction_audit (
      closure_id, neighborhood_id, fiscal_year, fee_record_id, operation,
      old_data, new_data, actor_auth_id
    ) VALUES (
      closure.id, target_neighborhood_id, target_fiscal_year, target_fee_record_id, TG_OP,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
      auth.uid()
    );
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS fee_records_audit_correction ON public.fee_records;
CREATE TRIGGER fee_records_audit_correction
AFTER INSERT OR UPDATE OR DELETE ON public.fee_records
FOR EACH ROW EXECUTE FUNCTION public.audit_fee_record_correction();

CREATE OR REPLACE FUNCTION public.finalize_fee_year(p_neighborhood_id BIGINT, p_fiscal_year INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closure public.fee_year_closures;
  next_revision INTEGER;
  snapshot_count INTEGER;
  event_name TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('fee-year:' || p_neighborhood_id || ':' || p_fiscal_year, 0));
  IF NOT public.fee_actor_is_admin(p_neighborhood_id) THEN RAISE EXCEPTION '年度会費を確定する権限がありません。'; END IF;
  IF p_fiscal_year NOT BETWEEN 2000 AND 2200 THEN RAISE EXCEPTION '会計年度が不正です。'; END IF;
  LOCK TABLE public.fee_records IN SHARE ROW EXCLUSIVE MODE;

  SELECT * INTO closure FROM public.fee_year_closures
  WHERE neighborhood_id = p_neighborhood_id AND fiscal_year = p_fiscal_year FOR UPDATE;
  IF closure.id IS NOT NULL AND closure.status = 'locked' THEN RAISE EXCEPTION '%年度は確定済みです。', p_fiscal_year; END IF;
  IF closure.id IS NOT NULL AND NOT public.fee_actor_is_representative(p_neighborhood_id) THEN
    RAISE EXCEPTION '確定解除後の再確定は代表者だけが実行できます。';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fee_records WHERE neighborhood_id = p_neighborhood_id AND fiscal_year = p_fiscal_year) THEN
    RAISE EXCEPTION '確定対象の会費データがありません。';
  END IF;

  next_revision := COALESCE(closure.revision, 0) + 1;
  event_name := CASE WHEN closure.id IS NULL THEN 'locked' ELSE 'relocked' END;

  INSERT INTO public.fee_year_closures (
    neighborhood_id, fiscal_year, status, revision, locked_at, locked_by,
    unlocked_at, unlocked_by, unlock_reason, updated_at
  ) VALUES (
    p_neighborhood_id, p_fiscal_year, 'locked', next_revision, NOW(), auth.uid(),
    NULL, NULL, NULL, NOW()
  )
  ON CONFLICT (neighborhood_id, fiscal_year) DO UPDATE SET
    status = 'locked', revision = EXCLUDED.revision, locked_at = NOW(), locked_by = auth.uid(),
    unlocked_at = NULL, unlocked_by = NULL, unlock_reason = NULL, updated_at = NOW()
  RETURNING * INTO closure;

  INSERT INTO public.fee_year_snapshot_rows (
    closure_id, revision, fee_record_id, neighborhood_id, fiscal_year,
    roster_id_snapshot, resident_name, resident_kana, postal_code, address_text,
    billing_amount, paid_amount, paid_amount_cash, paid_amount_stripe,
    payment_method, payment_status, fee_data, member_data, captured_by
  )
  SELECT
    closure.id, next_revision, fee.id::TEXT, fee.neighborhood_id, fee.fiscal_year,
    COALESCE(fee.roster_id_snapshot, fee.roster_id::TEXT), fee.resident_name,
    roster.kana_name,
    roster.postal_code,
    concat_ws(' ', roster.address_line2, roster.address_line3),
    COALESCE(fee.expected_amount, fee.billing_amount, fee.amount, 0),
    COALESCE(fee.paid_amount, 0), COALESCE(fee.paid_amount_cash, 0), COALESCE(fee.paid_amount_stripe, 0),
    fee.payment_method, fee.status, to_jsonb(fee),
    CASE WHEN roster.id IS NOT NULL THEN to_jsonb(roster) ELSE COALESCE(fee.member_snapshot, '{}'::JSONB) END,
    auth.uid()
  FROM public.fee_records AS fee
  LEFT JOIN public.resident_rosters AS roster ON roster.id = fee.roster_id
  WHERE fee.neighborhood_id = p_neighborhood_id AND fee.fiscal_year = p_fiscal_year;

  GET DIAGNOSTICS snapshot_count = ROW_COUNT;
  INSERT INTO public.fee_year_lock_events (
    closure_id, neighborhood_id, fiscal_year, revision, event_type, actor_auth_id
  ) VALUES (closure.id, p_neighborhood_id, p_fiscal_year, next_revision, event_name, auth.uid());

  RETURN jsonb_build_object('status', 'locked', 'revision', next_revision, 'snapshotCount', snapshot_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_fee_year(p_neighborhood_id BIGINT, p_fiscal_year INTEGER, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closure public.fee_year_closures;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('fee-year:' || p_neighborhood_id || ':' || p_fiscal_year, 0));
  IF NOT public.fee_actor_is_representative(p_neighborhood_id) THEN RAISE EXCEPTION '年度会費の確定を解除できるのは代表者だけです。'; END IF;
  IF length(btrim(COALESCE(p_reason, ''))) < 3 THEN RAISE EXCEPTION '確定を解除する理由を3文字以上で入力してください。'; END IF;

  SELECT * INTO closure FROM public.fee_year_closures
  WHERE neighborhood_id = p_neighborhood_id AND fiscal_year = p_fiscal_year FOR UPDATE;
  IF closure.id IS NULL OR closure.status <> 'locked' THEN RAISE EXCEPTION '%年度は確定されていません。', p_fiscal_year; END IF;

  UPDATE public.fee_year_closures SET
    status = 'unlocked', unlocked_at = NOW(), unlocked_by = auth.uid(),
    unlock_reason = btrim(p_reason), updated_at = NOW()
  WHERE id = closure.id RETURNING * INTO closure;

  INSERT INTO public.fee_year_lock_events (
    closure_id, neighborhood_id, fiscal_year, revision, event_type, reason, actor_auth_id
  ) VALUES (
    closure.id, p_neighborhood_id, p_fiscal_year, closure.revision, 'unlocked', btrim(p_reason), auth.uid()
  );

  RETURN jsonb_build_object('status', 'unlocked', 'revision', closure.revision);
END;
$$;

ALTER TABLE public.fee_year_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_year_snapshot_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_year_lock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_record_correction_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_year_post_lock_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fee_year_closures_read ON public.fee_year_closures;
CREATE POLICY fee_year_closures_read ON public.fee_year_closures FOR SELECT TO authenticated
USING (
  public.fee_actor_is_admin(neighborhood_id)
  OR EXISTS (
    SELECT 1 FROM public.resident_rosters AS roster
    WHERE roster.neighborhood_id = fee_year_closures.neighborhood_id
      AND (
        roster.user_auth_id::TEXT = auth.uid()::TEXT
        OR roster.family_user_auth_id_1::TEXT = auth.uid()::TEXT
        OR roster.family_user_auth_id_2::TEXT = auth.uid()::TEXT
      )
  )
);

DROP POLICY IF EXISTS fee_year_snapshots_admin_read ON public.fee_year_snapshot_rows;
CREATE POLICY fee_year_snapshots_admin_read ON public.fee_year_snapshot_rows FOR SELECT TO authenticated
USING (public.fee_actor_is_admin(neighborhood_id));
DROP POLICY IF EXISTS fee_year_lock_events_admin_read ON public.fee_year_lock_events;
CREATE POLICY fee_year_lock_events_admin_read ON public.fee_year_lock_events FOR SELECT TO authenticated
USING (public.fee_actor_is_admin(neighborhood_id));
DROP POLICY IF EXISTS fee_record_correction_audit_admin_read ON public.fee_record_correction_audit;
CREATE POLICY fee_record_correction_audit_admin_read ON public.fee_record_correction_audit FOR SELECT TO authenticated
USING (public.fee_actor_is_admin(neighborhood_id));
DROP POLICY IF EXISTS fee_year_post_lock_payments_admin_read ON public.fee_year_post_lock_payments;
CREATE POLICY fee_year_post_lock_payments_admin_read ON public.fee_year_post_lock_payments FOR SELECT TO authenticated
USING (public.fee_actor_is_admin(neighborhood_id));

GRANT SELECT ON public.fee_year_closures, public.fee_year_snapshot_rows, public.fee_year_lock_events, public.fee_record_correction_audit, public.fee_year_post_lock_payments TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_fee_year(BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_fee_year(BIGINT, INTEGER, TEXT) TO authenticated;

COMMENT ON TABLE public.fee_year_closures IS '町内会・自治会ごとの会費年度確定状態。';
COMMENT ON TABLE public.fee_year_snapshot_rows IS '年度確定時点の会費・会員情報を独立保存する改版スナップショット。';
COMMENT ON TABLE public.fee_record_correction_audit IS '代表者が確定解除後に行った会費訂正履歴。';
COMMENT ON TABLE public.fee_year_post_lock_payments IS '年度確定直前に作成済みだった決済画面から確定後に届いた入金。確定データは変更せず個別保管する。';

NOTIFY pgrst, 'reload schema';
COMMIT;
