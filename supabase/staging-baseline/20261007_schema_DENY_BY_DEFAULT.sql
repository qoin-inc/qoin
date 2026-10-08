-- Staging schema baseline: structure only, deny direct client access by default.
-- Derived from the guarded 2026-10-06 schema-only draft. No row data or Auth users.
-- Apply only to an EMPTY staging project after verifying its Project Ref outside SQL.
-- Do not replay the 12 existing migrations on top of this snapshot.
-- Storage bucket/policies and client GRANT/RLS rules require separate review.
BEGIN;
-- Refuse to modify a database that already contains application tables or Auth users.
-- The project identity must still be verified separately in the Supabase dashboard.
DO $empty_staging_guard$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  ) OR EXISTS (SELECT 1 FROM auth.users) THEN
    RAISE EXCEPTION 'Staging baseline requires an empty public schema and zero Auth users';
  END IF;
END;
$empty_staging_guard$;
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."assembly_actor_is_admin"("target_neighborhood_id" bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.neighborhood_admins AS admins
      WHERE admins.neighborhood_id = target_neighborhood_id
        AND admins.status = 'active' AND admins.admin_auth_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.neighborhoods AS town
      WHERE town.id = target_neighborhood_id AND town.admin_auth_id = auth.uid())
  );
$$;

ALTER FUNCTION "public"."assembly_actor_is_admin"("target_neighborhood_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assembly_actor_is_representative"("target_neighborhood_id" bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.neighborhoods AS town
    WHERE town.id = target_neighborhood_id AND town.admin_auth_id = auth.uid()
  );
$$;

ALTER FUNCTION "public"."assembly_actor_is_representative"("target_neighborhood_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_fee_record_correction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."audit_fee_record_correction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_unlocked_assembly_correction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_neighborhood_id BIGINT :=
    COALESCE(NEW.neighborhood_id, OLD.neighborhood_id);
  target_fiscal_year INTEGER :=
    COALESCE(NEW.fiscal_year, OLD.fiscal_year);
  target_record_id TEXT :=
    COALESCE(NEW.id, OLD.id)::TEXT;
  closure public.assembly_year_closures;
BEGIN
  SELECT * INTO closure
  FROM public.assembly_year_closures
  WHERE neighborhood_id = target_neighborhood_id
    AND fiscal_year = target_fiscal_year;

  IF closure.id IS NOT NULL
     AND closure.status = 'unlocked' THEN
    INSERT INTO public.assembly_record_correction_audit (
      closure_id,
      neighborhood_id,
      fiscal_year,
      table_name,
      record_id,
      operation,
      before_data,
      after_data,
      actor_auth_id
    ) VALUES (
      closure.id,
      target_neighborhood_id,
      target_fiscal_year,
      TG_TABLE_NAME,
      target_record_id,
      TG_OP,
      CASE
        WHEN TG_OP = 'INSERT' THEN NULL
        ELSE to_jsonb(OLD)
      END,
      CASE
        WHEN TG_OP = 'DELETE' THEN NULL
        ELSE to_jsonb(NEW)
      END,
      auth.uid()
    );
  END IF;

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$;


ALTER FUNCTION "public"."audit_unlocked_assembly_correction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."copy_published_membership_fee_standard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  standard public.membership_fee_standard_versions;
  inserted_setting public.neighborhood_fee_settings;
BEGIN
  SELECT *
    INTO standard
  FROM public.membership_fee_standard_versions
  WHERE status = 'published'
  ORDER BY version_number DESC
  LIMIT 1;

  IF standard.id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.neighborhood_fee_settings (
    neighborhood_id,
    standard_version_id,
    fee_name,
    amount,
    fiscal_year_start_month,
    billing_frequency,
    billing_target,
    cash_enabled,
    stripe_card_enabled,
    revenue_category,
    applied_at
  )
  VALUES (
    NEW.id,
    standard.id,
    standard.fee_name,
    standard.default_amount,
    standard.fiscal_year_start_month,
    standard.billing_frequency,
    standard.billing_target,
    standard.cash_enabled,
    standard.stripe_card_enabled,
    standard.revenue_category,
    NOW()
  )
  ON CONFLICT (neighborhood_id) DO NOTHING
  RETURNING * INTO inserted_setting;

  IF inserted_setting.id IS NOT NULL THEN
    INSERT INTO public.membership_fee_standard_applications (
      standard_version_id,
      neighborhood_id,
      before_settings,
      after_settings,
      application_type
    )
    VALUES (
      standard.id,
      NEW.id,
      NULL,
      to_jsonb(inserted_setting),
      'new_neighborhood'
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."copy_published_membership_fee_standard"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_facility_reservation"("p_facility_id" bigint, "p_reservation_date" "date", "p_start_time" "text", "p_end_time" "text", "p_participant_count" integer, "p_applicant_name" "text", "p_usage_purpose" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_facility public.facilities%ROWTYPE;
  target_roster public.resident_rosters%ROWTYPE;
  saved public.facility_reservations%ROWTYPE;
  normalized_start TIME;
  normalized_end TIME;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LINE認証が必要です。'; END IF;
  IF p_reservation_date IS NULL OR NULLIF(BTRIM(p_start_time), '') IS NULL OR NULLIF(BTRIM(p_end_time), '') IS NULL THEN
    RAISE EXCEPTION '予約年月日と利用時間を入力してください。';
  END IF;
  IF COALESCE(p_participant_count, 0) <= 0 THEN RAISE EXCEPTION '利用人数を入力してください。'; END IF;

  normalized_start := BTRIM(p_start_time)::TIME;
  normalized_end := BTRIM(p_end_time)::TIME;
  IF normalized_start >= normalized_end THEN RAISE EXCEPTION '終了時間は開始時間より後にしてください。'; END IF;

  SELECT * INTO target_facility FROM public.facilities
  WHERE id = p_facility_id AND COALESCE(is_active, TRUE) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION '予約できる施設が見つかりません。'; END IF;

  SELECT * INTO target_roster FROM public.resident_rosters roster
  WHERE roster.neighborhood_id = target_facility.neighborhood_id
    AND COALESCE(roster.withdrawal_status, 'active') <> 'withdrawn'
    AND (
      roster.user_auth_id::TEXT = auth.uid()::TEXT
      OR (roster.family_user_auth_id_1::TEXT = auth.uid()::TEXT AND COALESCE(roster.family_withdrawal_status_1, 'active') <> 'withdrawn')
      OR (roster.family_user_auth_id_2::TEXT = auth.uid()::TEXT AND COALESCE(roster.family_withdrawal_status_2, 'active') <> 'withdrawn')
    ) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'この町内会に連携された会員情報を確認できません。LINEから再度接続してください。'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(target_facility.id::TEXT || ':' || p_reservation_date::TEXT, 0));
  IF EXISTS (
    SELECT 1 FROM public.facility_reservations existing
    WHERE existing.facility_bigint_id = target_facility.id
      AND existing.reservation_date = p_reservation_date
      AND existing.status IN ('pending', 'approved')
      AND existing.start_time::TIME < normalized_end
      AND normalized_start < existing.end_time::TIME
  ) THEN
    RAISE EXCEPTION 'この施設・日付・時間帯は既に予約されています。別の時間を選択してください。';
  END IF;

  INSERT INTO public.facility_reservations (
    facility_bigint_id, facility_name, title, neighborhood_id, resident_roster_id, user_auth_id,
    applicant_name, resident_name, participant_count, people_count, num_people, usage_purpose,
    reservation_date, start_time, end_time, status, created_at, updated_at
  ) VALUES (
    target_facility.id, COALESCE(target_facility.name, '施設'), COALESCE(target_facility.name, '施設'), target_facility.neighborhood_id,
    target_roster.id, auth.uid()::TEXT, NULLIF(BTRIM(p_applicant_name), ''), NULLIF(BTRIM(p_applicant_name), ''),
    p_participant_count, p_participant_count, p_participant_count, NULLIF(BTRIM(p_usage_purpose), ''),
    p_reservation_date, normalized_start, normalized_end, 'pending', NOW(), NOW()
  ) RETURNING * INTO saved;
  RETURN to_jsonb(saved);
END;
$$;


ALTER FUNCTION "public"."create_facility_reservation"("p_facility_id" bigint, "p_reservation_date" "date", "p_start_time" "text", "p_end_time" "text", "p_participant_count" integer, "p_applicant_name" "text", "p_usage_purpose" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_live_session_application"("p_live_session_id" bigint, "p_participant_count" integer, "p_applicant_name" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_session public.live_sessions%ROWTYPE;
  target_roster public.resident_rosters%ROWTYPE;
  saved public.live_session_applications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'LINE認証が必要です。';
  END IF;
  IF COALESCE(p_participant_count, 0) <= 0 THEN
    RAISE EXCEPTION '参加人数を入力してください。';
  END IF;

  SELECT * INTO target_session
  FROM public.live_sessions
  WHERE id = p_live_session_id
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION '参加できるWeb会議が見つかりません。';
  END IF;

  SELECT * INTO target_roster
  FROM public.resident_rosters roster
  WHERE roster.neighborhood_id = target_session.neighborhood_id
    AND COALESCE(roster.withdrawal_status, 'active') <> 'withdrawn'
    AND (
      roster.user_auth_id::TEXT = auth.uid()::TEXT
      OR (roster.family_user_auth_id_1::TEXT = auth.uid()::TEXT AND COALESCE(roster.family_withdrawal_status_1, 'active') <> 'withdrawn')
      OR (roster.family_user_auth_id_2::TEXT = auth.uid()::TEXT AND COALESCE(roster.family_withdrawal_status_2, 'active') <> 'withdrawn')
    )
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'この町内会に連携された会員情報を確認できません。LINEから再度接続してください。';
  END IF;

  INSERT INTO public.live_session_applications (
    live_session_id, session_id, neighborhood_id, resident_roster_id,
    user_auth_id, resident_name, applicant_name, participant_count,
    people_count, reply_status, response_status, status, applied_at, updated_at
  ) VALUES (
    target_session.id, target_session.id, target_session.neighborhood_id, target_roster.id,
    auth.uid()::TEXT, NULLIF(BTRIM(p_applicant_name), ''), NULLIF(BTRIM(p_applicant_name), ''),
    p_participant_count, p_participant_count, 'attend', 'attend', 'attend', NOW(), NOW()
  )
  ON CONFLICT (live_session_id, resident_roster_id)
    WHERE live_session_id IS NOT NULL AND resident_roster_id IS NOT NULL
  DO UPDATE SET
    session_id = EXCLUDED.session_id,
    neighborhood_id = EXCLUDED.neighborhood_id,
    user_auth_id = EXCLUDED.user_auth_id,
    resident_name = EXCLUDED.resident_name,
    applicant_name = EXCLUDED.applicant_name,
    participant_count = EXCLUDED.participant_count,
    people_count = EXCLUDED.people_count,
    reply_status = EXCLUDED.reply_status,
    response_status = EXCLUDED.response_status,
    status = EXCLUDED.status,
    applied_at = EXCLUDED.applied_at,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO saved;

  RETURN to_jsonb(saved);
END;
$$;


ALTER FUNCTION "public"."create_live_session_application"("p_live_session_id" bigint, "p_participant_count" integer, "p_applicant_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_own_facility_reservation"("p_reservation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted public.facility_reservations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LINE認証が必要です。'; END IF;

  DELETE FROM public.facility_reservations reservation
  WHERE reservation.id = p_reservation_id
    AND (
      reservation.user_auth_id::TEXT = auth.uid()::TEXT
      OR EXISTS (
        SELECT 1
        FROM public.resident_rosters roster
        WHERE roster.id = reservation.resident_roster_id
          AND (
            roster.user_auth_id::TEXT = auth.uid()::TEXT
            OR roster.family_user_auth_id_1::TEXT = auth.uid()::TEXT
            OR roster.family_user_auth_id_2::TEXT = auth.uid()::TEXT
          )
      )
    )
  RETURNING reservation.* INTO deleted;

  IF NOT FOUND THEN RAISE EXCEPTION '本人が申し込んだ施設予約が見つかりません。'; END IF;
  RETURN to_jsonb(deleted);
END;
$$;


ALTER FUNCTION "public"."delete_own_facility_reservation"("p_reservation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."el_town_actor_is_system_admin"() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$ SELECT false; $$;

ALTER FUNCTION "public"."el_town_actor_is_system_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."el_town_actor_is_system_admin"() IS 'Supabase認証済みのel-townシステム権限者を判定する。';



CREATE OR REPLACE FUNCTION "public"."ensure_system_admin_for_neighborhood"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$ BEGIN RETURN NEW; END; $$;

ALTER FUNCTION "public"."ensure_system_admin_for_neighborhood"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fee_actor_is_admin"("target_neighborhood_id" bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.neighborhood_admins AS admins
      WHERE admins.neighborhood_id = target_neighborhood_id
        AND admins.status = 'active' AND admins.admin_auth_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.neighborhoods AS town
      WHERE town.id = target_neighborhood_id AND town.admin_auth_id = auth.uid())
  );
$$;

ALTER FUNCTION "public"."fee_actor_is_admin"("target_neighborhood_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fee_actor_is_representative"("target_neighborhood_id" bigint) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.neighborhoods AS town
    WHERE town.id = target_neighborhood_id AND town.admin_auth_id = auth.uid()
  );
$$;

ALTER FUNCTION "public"."fee_actor_is_representative"("target_neighborhood_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_assembly_year"("p_neighborhood_id" bigint, "p_fiscal_year" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  closure public.assembly_year_closures;
  next_revision INTEGER;
  event_name TEXT;
  category_rows JSONB;
  budget_rows JSONB;
  settlement_rows JSONB;
  fee_rows_json JSONB;
  fee_total NUMERIC;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'assembly-year:' ||
      p_neighborhood_id ||
      ':' ||
      p_fiscal_year,
      0
    )
  );

  IF p_fiscal_year NOT BETWEEN 2000 AND 2200 THEN
    RAISE EXCEPTION '会計年度が不正です。';
  END IF;

  IF NOT public.assembly_actor_is_admin(
    p_neighborhood_id
  ) THEN
    RAISE EXCEPTION
      '総会会計年度を確定する権限がありません。';
  END IF;

  SELECT * INTO closure
  FROM public.assembly_year_closures
  WHERE neighborhood_id = p_neighborhood_id
    AND fiscal_year = p_fiscal_year
  FOR UPDATE;

  IF closure.id IS NOT NULL
     AND closure.status = 'locked' THEN
    RAISE EXCEPTION
      '%年度は確定済みです。',
      p_fiscal_year;
  END IF;

  IF closure.id IS NOT NULL
     AND NOT public.assembly_actor_is_representative(
       p_neighborhood_id
     ) THEN
    RAISE EXCEPTION
      '確定解除後の再確定は代表者だけが実行できます。';
  END IF;

  PERFORM 1
  FROM public.assembly_budgets
  WHERE neighborhood_id = p_neighborhood_id
    AND fiscal_year = p_fiscal_year
  FOR UPDATE;

  PERFORM 1
  FROM public.assembly_settlements
  WHERE neighborhood_id = p_neighborhood_id
    AND fiscal_year = p_fiscal_year
  FOR UPDATE;

  SELECT COALESCE(
    jsonb_agg(
      to_jsonb(category)
      ORDER BY category.sort_order, category.id
    ),
    '[]'::JSONB
  )
  INTO category_rows
  FROM public.assembly_categories category
  WHERE category.neighborhood_id = p_neighborhood_id
    AND COALESCE(category.is_active, TRUE) = TRUE;

  SELECT COALESCE(
    jsonb_agg(
      to_jsonb(budget)
      ORDER BY budget.category_id, budget.id
    ),
    '[]'::JSONB
  )
  INTO budget_rows
  FROM public.assembly_budgets budget
  WHERE budget.neighborhood_id = p_neighborhood_id
    AND budget.fiscal_year = p_fiscal_year;

  SELECT COALESCE(
    jsonb_agg(
      to_jsonb(settlement)
      ORDER BY settlement.paid_date DESC, settlement.id DESC
    ),
    '[]'::JSONB
  )
  INTO settlement_rows
  FROM public.assembly_settlements settlement
  WHERE settlement.neighborhood_id = p_neighborhood_id
    AND settlement.fiscal_year = p_fiscal_year;

  SELECT
    COALESCE(
      jsonb_agg(to_jsonb(fee) ORDER BY fee.id),
      '[]'::JSONB
    ),
    COALESCE(
      SUM(
        COALESCE(
          fee.paid_amount,
          COALESCE(fee.paid_amount_cash, 0)
            + COALESCE(fee.paid_amount_stripe, 0),
          0
        )
      ),
      0
    )
  INTO fee_rows_json, fee_total
  FROM public.fee_records fee
  WHERE fee.neighborhood_id = p_neighborhood_id
    AND COALESCE(fee.fiscal_year, fee.year) =
        p_fiscal_year;

  next_revision := COALESCE(closure.revision, 0) + 1;

  event_name := CASE
    WHEN closure.id IS NULL THEN 'locked'
    ELSE 'relocked'
  END;

  INSERT INTO public.assembly_year_closures (
    neighborhood_id,
    fiscal_year,
    status,
    revision,
    locked_at,
    locked_by,
    unlocked_at,
    unlocked_by,
    unlock_reason,
    updated_at
  ) VALUES (
    p_neighborhood_id,
    p_fiscal_year,
    'locked',
    next_revision,
    NOW(),
    auth.uid(),
    NULL,
    NULL,
    NULL,
    NOW()
  )
  ON CONFLICT (neighborhood_id, fiscal_year)
  DO UPDATE SET
    status = 'locked',
    revision = EXCLUDED.revision,
    locked_at = NOW(),
    locked_by = auth.uid(),
    unlocked_at = NULL,
    unlocked_by = NULL,
    unlock_reason = NULL,
    updated_at = NOW()
  RETURNING * INTO closure;

  INSERT INTO public.assembly_year_snapshots (
    closure_id,
    revision,
    neighborhood_id,
    fiscal_year,
    categories,
    budgets,
    settlements,
    fee_rows,
    fee_revenue,
    captured_by
  ) VALUES (
    closure.id,
    next_revision,
    p_neighborhood_id,
    p_fiscal_year,
    category_rows,
    budget_rows,
    settlement_rows,
    fee_rows_json,
    fee_total,
    auth.uid()
  );

  INSERT INTO public.assembly_year_lock_events (
    closure_id,
    neighborhood_id,
    fiscal_year,
    revision,
    event_type,
    actor_auth_id
  ) VALUES (
    closure.id,
    p_neighborhood_id,
    p_fiscal_year,
    next_revision,
    event_name,
    auth.uid()
  );

  RETURN jsonb_build_object(
    'status', 'locked',
    'revision', next_revision,
    'categoryCount', jsonb_array_length(category_rows),
    'budgetCount', jsonb_array_length(budget_rows),
    'settlementCount', jsonb_array_length(settlement_rows),
    'feeRevenue', fee_total
  );
END;
$$;


ALTER FUNCTION "public"."finalize_assembly_year"("p_neighborhood_id" bigint, "p_fiscal_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_fee_year"("p_neighborhood_id" bigint, "p_fiscal_year" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  closure public.fee_year_closures;
  next_revision INTEGER;
  snapshot_count INTEGER;
  event_name TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'fee-year:' || p_neighborhood_id || ':' || p_fiscal_year,
      0
    )
  );

  IF NOT public.fee_actor_is_admin(p_neighborhood_id) THEN
    RAISE EXCEPTION '年度会費を確定する権限がありません。';
  END IF;

  IF p_fiscal_year NOT BETWEEN 2000 AND 2200 THEN
    RAISE EXCEPTION '会計年度が不正です。';
  END IF;

  LOCK TABLE public.fee_records IN SHARE ROW EXCLUSIVE MODE;

  SELECT *
  INTO closure
  FROM public.fee_year_closures
  WHERE neighborhood_id = p_neighborhood_id
    AND fiscal_year = p_fiscal_year
  FOR UPDATE;

  IF closure.id IS NOT NULL AND closure.status = 'locked' THEN
    RAISE EXCEPTION '%年度は確定済みです。', p_fiscal_year;
  END IF;

  IF closure.id IS NOT NULL
     AND NOT public.fee_actor_is_representative(p_neighborhood_id) THEN
    RAISE EXCEPTION '確定解除後の再確定は代表者だけが実行できます。';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.fee_records
    WHERE neighborhood_id = p_neighborhood_id
      AND fiscal_year = p_fiscal_year
  ) THEN
    RAISE EXCEPTION '確定対象の会費データがありません。';
  END IF;

  next_revision := COALESCE(closure.revision, 0) + 1;
  event_name :=
    CASE WHEN closure.id IS NULL THEN 'locked' ELSE 'relocked' END;

  INSERT INTO public.fee_year_closures (
    neighborhood_id,
    fiscal_year,
    status,
    revision,
    locked_at,
    locked_by,
    unlocked_at,
    unlocked_by,
    unlock_reason,
    updated_at
  )
  VALUES (
    p_neighborhood_id,
    p_fiscal_year,
    'locked',
    next_revision,
    NOW(),
    auth.uid(),
    NULL,
    NULL,
    NULL,
    NOW()
  )
  ON CONFLICT (neighborhood_id, fiscal_year)
  DO UPDATE SET
    status = 'locked',
    revision = EXCLUDED.revision,
    locked_at = NOW(),
    locked_by = auth.uid(),
    unlocked_at = NULL,
    unlocked_by = NULL,
    unlock_reason = NULL,
    updated_at = NOW()
  RETURNING * INTO closure;

  INSERT INTO public.fee_year_snapshot_rows (
    closure_id,
    revision,
    fee_record_id,
    neighborhood_id,
    fiscal_year,
    roster_id_snapshot,
    resident_name,
    resident_kana,
    postal_code,
    address_text,
    billing_amount,
    paid_amount,
    paid_amount_cash,
    paid_amount_stripe,
    payment_method,
    payment_status,
    fee_data,
    member_data,
    captured_by
  )
  SELECT
    closure.id,
    next_revision,
    fee.id::TEXT,
    fee.neighborhood_id,
    fee.fiscal_year,
    COALESCE(fee.roster_id_snapshot, fee.roster_id::TEXT),
    fee.resident_name,
    COALESCE(
      to_jsonb(roster) ->> 'kana_name',
      to_jsonb(roster) ->> 'full_name_kana'
    ),
    to_jsonb(roster) ->> 'postal_code',
    concat_ws(
      ' ',
      NULLIF(
        COALESCE(
          to_jsonb(roster) ->> 'address_line2',
          to_jsonb(roster) ->> 'address2',
          to_jsonb(roster) ->> 'address'
        ),
        ''
      ),
      NULLIF(
        COALESCE(
          to_jsonb(roster) ->> 'address_line3',
          to_jsonb(roster) ->> 'address3'
        ),
        ''
      )
    ),
    COALESCE(
      fee.expected_amount,
      fee.billing_amount,
      fee.amount,
      0
    ),
    COALESCE(fee.paid_amount, 0),
    COALESCE(fee.paid_amount_cash, 0),
    COALESCE(fee.paid_amount_stripe, 0),
    fee.payment_method,
    fee.status,
    to_jsonb(fee),
    CASE
      WHEN roster.id IS NOT NULL THEN to_jsonb(roster)
      ELSE COALESCE(fee.member_snapshot, '{}'::JSONB)
    END,
    auth.uid()
  FROM public.fee_records AS fee
  LEFT JOIN public.resident_rosters AS roster
    ON roster.id = fee.roster_id
  WHERE fee.neighborhood_id = p_neighborhood_id
    AND fee.fiscal_year = p_fiscal_year;

  GET DIAGNOSTICS snapshot_count = ROW_COUNT;

  INSERT INTO public.fee_year_lock_events (
    closure_id,
    neighborhood_id,
    fiscal_year,
    revision,
    event_type,
    actor_auth_id
  )
  VALUES (
    closure.id,
    p_neighborhood_id,
    p_fiscal_year,
    next_revision,
    event_name,
    auth.uid()
  );

  RETURN jsonb_build_object(
    'status', 'locked',
    'revision', next_revision,
    'snapshotCount', snapshot_count
  );
END;
$$;


ALTER FUNCTION "public"."finalize_fee_year"("p_neighborhood_id" bigint, "p_fiscal_year" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_push_count"("town_id" integer, "start_time" timestamp with time zone) RETURNS bigint
    LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
    AS $$
  SELECT COALESCE(SUM(recipient_count), 0)::BIGINT
  FROM public.line_push_logs
  WHERE neighborhood_id = town_id AND sent_at >= start_time;
$$;

ALTER FUNCTION "public"."get_monthly_push_count"("town_id" integer, "start_time" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_finalized_assembly_record"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  old_closure public.assembly_year_closures;
  new_closure public.assembly_year_closures;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    SELECT * INTO old_closure
    FROM public.assembly_year_closures
    WHERE neighborhood_id = OLD.neighborhood_id
      AND fiscal_year = OLD.fiscal_year;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT * INTO new_closure
    FROM public.assembly_year_closures
    WHERE neighborhood_id = NEW.neighborhood_id
      AND fiscal_year = NEW.fiscal_year;
  END IF;

  IF old_closure.status = 'locked'
     OR new_closure.status = 'locked' THEN
    RAISE EXCEPTION
      '確定済み年度の総会会計データは変更できません。代表者が確定を解除してください。';
  END IF;

  IF (
    old_closure.status = 'unlocked'
    AND NOT public.assembly_actor_is_representative(
      old_closure.neighborhood_id
    )
  ) OR (
    new_closure.status = 'unlocked'
    AND NOT public.assembly_actor_is_representative(
      new_closure.neighborhood_id
    )
  ) THEN
    RAISE EXCEPTION
      '確定解除後の総会会計訂正は代表者だけが実行できます。';
  END IF;

  RETURN CASE
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$;


ALTER FUNCTION "public"."guard_finalized_assembly_record"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_finalized_fee_record"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  old_closure public.fee_year_closures;
  new_closure public.fee_year_closures;
  only_roster_detached BOOLEAN := FALSE;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT * INTO old_closure
    FROM public.fee_year_closures
    WHERE neighborhood_id = OLD.neighborhood_id
      AND fiscal_year = OLD.fiscal_year;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    only_roster_detached := OLD.roster_id IS NOT NULL
      AND NEW.roster_id IS NULL
      AND (to_jsonb(NEW) - 'roster_id') = (to_jsonb(OLD) - 'roster_id');
  END IF;

  IF only_roster_detached THEN
    RETURN NEW;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT * INTO new_closure
    FROM public.fee_year_closures
    WHERE neighborhood_id = NEW.neighborhood_id
      AND fiscal_year = NEW.fiscal_year;
  END IF;

  IF old_closure.status = 'locked'
     OR new_closure.status = 'locked' THEN
    RAISE EXCEPTION
      '確定済み年度の会費は変更できません。代表者が確定を解除してください。';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_finalized_fee_record"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_finalized_fee_record"() IS '確定済み年度の会費変更を禁止する。代表者による確定解除後は、RLSで許可された役員全員が訂正可能。';



CREATE OR REPLACE FUNCTION "public"."guard_resident_roster_withdrawal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."guard_resident_roster_withdrawal"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."guard_resident_roster_withdrawal"() IS '退会時のLINE連携解除を保証し、有効な町内会・自治会役員による退会済み世帯の復帰だけを許可する。';



CREATE OR REPLACE FUNCTION "public"."handle_delete_auth_user"() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
    AS $$ BEGIN RETURN OLD; END; $$;

ALTER FUNCTION "public"."handle_delete_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_neighborhood_assembly_categories"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.assembly_categories (
    neighborhood_id,
    type,
    name,
    parent_id,
    sort_order,
    is_standard,
    is_active
  )
  SELECT
    NEW.id,
    standard.type,
    standard.name,
    NULL,
    standard.sort_order,
    TRUE,
    TRUE
  FROM public.assembly_standard_categories AS standard
  WHERE standard.is_active = TRUE
  ORDER BY standard.sort_order, standard.id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."initialize_neighborhood_assembly_categories"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."initialize_neighborhood_assembly_categories"() IS '新規町内会・自治会へ有効な総会会計標準科目を自動登録する。';



CREATE OR REPLACE FUNCTION "public"."is_el_town_system_admin"() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$ SELECT false; $$;

ALTER FUNCTION "public"."is_el_town_system_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_resident_roster_by_identity"("p_neighborhood_id" bigint, "p_full_name" "text", "p_kana_name" "text", "p_postal_code" "text", "p_address2" "text", "p_address3" "text" DEFAULT ''::"text", "p_line_user_id" "text" DEFAULT NULL::"text", "p_line_display_name" "text" DEFAULT NULL::"text", "p_member_name" "text" DEFAULT NULL::"text", "p_member_kana_name" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
  IF target.user_auth_id IS NULL OR target.user_auth_id = auth.uid() THEN
    UPDATE public.resident_rosters SET
      user_auth_id = auth.uid(),
      line_user_id = COALESCE(p_line_user_id, line_user_id)
    WHERE id = target.id;
    RETURN jsonb_build_object('roster_id', target.id, 'role', 'primary');
  END IF;

  IF target.family_user_auth_id_1::TEXT = auth.uid()::TEXT THEN
    IF NULLIF(BTRIM(p_member_name), '') IS NULL OR NULLIF(BTRIM(p_member_kana_name), '') IS NULL THEN
      RAISE EXCEPTION '登録する家族本人の氏名とカナ氏名を入力してください。';
    END IF;
    UPDATE public.resident_rosters SET
      family_name_1 = BTRIM(p_member_name),
      family_kana_name_1 = BTRIM(p_member_kana_name),
      family_line_user_id_1 = COALESCE(p_line_user_id, family_line_user_id_1),
      family_withdrawal_status_1 = 'active'
    WHERE id = target.id;
    RETURN jsonb_build_object('roster_id', target.id, 'role', 'family1');
  END IF;

  IF target.family_user_auth_id_2::TEXT = auth.uid()::TEXT THEN
    IF NULLIF(BTRIM(p_member_name), '') IS NULL OR NULLIF(BTRIM(p_member_kana_name), '') IS NULL THEN
      RAISE EXCEPTION '登録する家族本人の氏名とカナ氏名を入力してください。';
    END IF;
    UPDATE public.resident_rosters SET
      family_name_2 = BTRIM(p_member_name),
      family_kana_name_2 = BTRIM(p_member_kana_name),
      family_line_user_id_2 = COALESCE(p_line_user_id, family_line_user_id_2),
      family_withdrawal_status_2 = 'active'
    WHERE id = target.id;
    RETURN jsonb_build_object('roster_id', target.id, 'role', 'family2');
  END IF;

  IF NULLIF(BTRIM(p_member_name), '') IS NULL OR NULLIF(BTRIM(p_member_kana_name), '') IS NULL THEN
    RAISE EXCEPTION '登録する家族本人の氏名とカナ氏名を入力してください。';
  END IF;

  IF target.family_user_auth_id_1 IS NULL AND target.family_invite_token_1 IS NULL THEN
    UPDATE public.resident_rosters SET
      family_name_1 = BTRIM(p_member_name),
      family_kana_name_1 = BTRIM(p_member_kana_name),
      family_user_auth_id_1 = auth.uid()::TEXT,
      family_line_user_id_1 = COALESCE(p_line_user_id, family_line_user_id_1),
      family_invite_token_1 = NULL,
      family_invited_at_1 = NULL,
      family_withdrawal_status_1 = 'active'
    WHERE id = target.id;
    RETURN jsonb_build_object('roster_id', target.id, 'role', 'family1');
  END IF;

  IF target.family_user_auth_id_2 IS NULL AND target.family_invite_token_2 IS NULL THEN
    UPDATE public.resident_rosters SET
      family_name_2 = BTRIM(p_member_name),
      family_kana_name_2 = BTRIM(p_member_kana_name),
      family_user_auth_id_2 = auth.uid()::TEXT,
      family_line_user_id_2 = COALESCE(p_line_user_id, family_line_user_id_2),
      family_invite_token_2 = NULL,
      family_invited_at_2 = NULL,
      family_withdrawal_status_2 = 'active'
    WHERE id = target.id;
    RETURN jsonb_build_object('roster_id', target.id, 'role', 'family2');
  END IF;

  RAISE EXCEPTION 'この世帯は家族2名まで連携済みです。世帯主へ確認してください。';
END;
$$;


ALTER FUNCTION "public"."link_resident_roster_by_identity"("p_neighborhood_id" bigint, "p_full_name" "text", "p_kana_name" "text", "p_postal_code" "text", "p_address2" "text", "p_address3" "text", "p_line_user_id" "text", "p_line_display_name" "text", "p_member_name" "text", "p_member_kana_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_facility_reservation_overlap"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.facility_bigint_id IS NULL OR NEW.reservation_date IS NULL OR NEW.status NOT IN ('pending', 'approved') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.facility_bigint_id::TEXT || ':' || NEW.reservation_date::TEXT, 0));

  IF EXISTS (
    SELECT 1
    FROM public.facility_reservations existing
    WHERE existing.facility_bigint_id = NEW.facility_bigint_id
      AND existing.reservation_date = NEW.reservation_date
      AND existing.status IN ('pending', 'approved')
      AND existing.id IS DISTINCT FROM NEW.id
      AND existing.start_time::TIME < NEW.end_time::TIME
      AND NEW.start_time::TIME < existing.end_time::TIME
  ) THEN
    RAISE EXCEPTION 'この施設・日付・時間帯は既に予約されています。別の時間を選択してください。';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_facility_reservation_overlap"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."membership_fee_standard_versions" (
    "id" bigint NOT NULL,
    "version_number" integer NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "fee_name" "text" DEFAULT '年会費'::"text" NOT NULL,
    "default_amount" integer DEFAULT 3000 NOT NULL,
    "fiscal_year_start_month" integer DEFAULT 4 NOT NULL,
    "billing_frequency" "text" DEFAULT 'annual'::"text" NOT NULL,
    "billing_target" "text" DEFAULT 'active_households'::"text" NOT NULL,
    "cash_enabled" boolean DEFAULT true NOT NULL,
    "stripe_card_enabled" boolean DEFAULT true NOT NULL,
    "revenue_category" "text" DEFAULT '会費'::"text" NOT NULL,
    "change_reason" "text" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "published_at" timestamp with time zone,
    "retired_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "membership_fee_standard_versions_billing_frequency_check" CHECK (("billing_frequency" = 'annual'::"text")),
    CONSTRAINT "membership_fee_standard_versions_billing_target_check" CHECK (("billing_target" = 'active_households'::"text")),
    CONSTRAINT "membership_fee_standard_versions_default_amount_check" CHECK (("default_amount" >= 0)),
    CONSTRAINT "membership_fee_standard_versions_fiscal_year_start_month_check" CHECK ((("fiscal_year_start_month" >= 1) AND ("fiscal_year_start_month" <= 12))),
    CONSTRAINT "membership_fee_standard_versions_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'retired'::"text"]))),
    CONSTRAINT "membership_fee_standard_versions_version_number_check" CHECK (("version_number" > 0))
);


ALTER TABLE "public"."membership_fee_standard_versions" OWNER TO "postgres";


COMMENT ON TABLE "public"."membership_fee_standard_versions" IS 'el-town全体の会費標準設定。公開済み版は上書きせず、版を追加する。';



CREATE OR REPLACE FUNCTION "public"."publish_membership_fee_standard"("p_version_id" bigint) RETURNS "public"."membership_fee_standard_versions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
  published_version public.membership_fee_standard_versions;
BEGIN
  IF NOT public.is_el_town_system_admin() THEN
    RAISE EXCEPTION 'Only the el-town system administrator can publish membership fee standards.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.membership_fee_standard_versions
    WHERE id = p_version_id
      AND status = 'draft'
  ) THEN
    RAISE EXCEPTION 'The requested draft membership fee standard was not found.';
  END IF;

  UPDATE public.membership_fee_standard_versions
  SET status = 'retired',
      retired_at = NOW()
  WHERE status = 'published';

  UPDATE public.membership_fee_standard_versions
  SET status = 'published',
      published_at = NOW(),
      retired_at = NULL
  WHERE id = p_version_id
  RETURNING * INTO published_version;

  RETURN published_version;
END;
$$;


ALTER FUNCTION "public"."publish_membership_fee_standard"("p_version_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_stripe_fee_payment"("p_fee_id" "text", "p_payment_intent" "text", "p_amount" bigint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE fee public.fee_records%ROWTYPE; inserted_count integer; cash_amount numeric; stripe_amount numeric; billed numeric;
BEGIN
  IF p_amount <= 0 OR p_payment_intent IS NULL OR p_payment_intent = '' THEN RAISE EXCEPTION 'Invalid payment'; END IF;
  SELECT * INTO STRICT fee FROM public.fee_records WHERE id::text = p_fee_id;
  PERFORM pg_advisory_xact_lock(hashtextextended('fee-year:' || fee.neighborhood_id || ':' || fee.fiscal_year, 0));
  SELECT * INTO STRICT fee FROM public.fee_records WHERE id::text = p_fee_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.fee_year_closures WHERE neighborhood_id=fee.neighborhood_id AND fiscal_year=fee.fiscal_year) THEN
    RAISE EXCEPTION 'Fee year changed; retry through the post-lock payment workflow';
  END IF;
  -- A replay of the pre-migration last payment must not be counted again.
  INSERT INTO public.fee_stripe_payments(stripe_payment_intent_id, fee_record_id, amount)
    VALUES(p_payment_intent, p_fee_id, p_amount) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF EXISTS(SELECT 1 FROM public.fee_stripe_payments WHERE stripe_payment_intent_id=p_payment_intent AND (fee_record_id<>p_fee_id OR amount<>p_amount)) THEN RAISE EXCEPTION 'Payment identity mismatch'; END IF;
  IF inserted_count = 0 OR fee.stripe_payment_intent_id = p_payment_intent THEN RETURN; END IF;
  cash_amount := coalesce(fee.paid_amount_cash, 0);
  stripe_amount := coalesce(fee.paid_amount_stripe, 0) + p_amount;
  billed := coalesce(fee.expected_amount, fee.billing_amount, fee.amount, 0);
  UPDATE public.fee_records SET paid_amount_cash=cash_amount, paid_amount_stripe=stripe_amount,
    paid_amount=cash_amount+stripe_amount, payment_method='stripe', last_payment_method='stripe',
    status=CASE WHEN cash_amount+stripe_amount >= billed THEN 'paid' ELSE 'partial' END,
    stripe_payment_intent_id=p_payment_intent, paid_at=coalesce(fee.paid_at, now()) WHERE id=fee.id;
END $$;


ALTER FUNCTION "public"."record_stripe_fee_payment"("p_fee_id" "text", "p_payment_intent" "text", "p_amount" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_fee_record_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."set_fee_record_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_membership_fee_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_membership_fee_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_own_fee_cash_collection_request"("p_fee_record_id" "text", "p_requested" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  target_fee public.fee_records%ROWTYPE;
  saved_requested BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '会員ログインが必要です。';
  END IF;
  IF p_requested IS NULL THEN
    RAISE EXCEPTION '集金希望の指定が必要です。';
  END IF;

  SELECT * INTO target_fee
  FROM public.fee_records
  WHERE id::TEXT = p_fee_record_id
  FOR UPDATE;
  IF NOT FOUND OR target_fee.roster_id IS NULL THEN
    RAISE EXCEPTION '対象の会費請求を確認できません。';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.resident_rosters AS roster
    WHERE roster.id = target_fee.roster_id
      AND roster.neighborhood_id = target_fee.neighborhood_id
      AND auth.uid()::TEXT IN (
        roster.user_auth_id::TEXT,
        roster.family_user_auth_id_1::TEXT,
        roster.family_user_auth_id_2::TEXT
      )
  ) THEN
    RAISE EXCEPTION 'この会費請求を変更する権限がありません。';
  END IF;

  IF p_requested AND EXISTS (
    SELECT 1
    FROM public.neighborhood_fee_settings AS settings
    WHERE settings.neighborhood_id = target_fee.neighborhood_id
      AND settings.cash_enabled = FALSE
  ) THEN
    RAISE EXCEPTION 'この団体では集金を受け付けていません。';
  END IF;

  IF p_requested AND COALESCE(target_fee.expected_amount, target_fee.billing_amount, target_fee.amount, 0)
    <= COALESCE(target_fee.paid_amount, COALESCE(target_fee.paid_amount_cash, 0) + COALESCE(target_fee.paid_amount_stripe, 0)) THEN
    RAISE EXCEPTION '完納済みの会費には集金を希望できません。';
  END IF;

  UPDATE public.fee_records
  SET cash_collection_requested = p_requested
  WHERE id::TEXT = p_fee_record_id
  RETURNING cash_collection_requested INTO saved_requested;

  RETURN saved_requested;
END;
$$;


ALTER FUNCTION "public"."set_own_fee_cash_collection_request"("p_fee_record_id" "text", "p_requested" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlock_assembly_year"("p_neighborhood_id" bigint, "p_fiscal_year" integer, "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  closure public.assembly_year_closures;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'assembly-year:' ||
      p_neighborhood_id ||
      ':' ||
      p_fiscal_year,
      0
    )
  );

  IF NOT public.assembly_actor_is_representative(
    p_neighborhood_id
  ) THEN
    RAISE EXCEPTION
      '総会会計の確定を解除できるのは代表者だけです。';
  END IF;

  IF length(
    btrim(COALESCE(p_reason, ''))
  ) < 3 THEN
    RAISE EXCEPTION
      '確定を解除する理由を3文字以上で入力してください。';
  END IF;

  SELECT * INTO closure
  FROM public.assembly_year_closures
  WHERE neighborhood_id = p_neighborhood_id
    AND fiscal_year = p_fiscal_year
  FOR UPDATE;

  IF closure.id IS NULL
     OR closure.status <> 'locked' THEN
    RAISE EXCEPTION
      '%年度は確定されていません。',
      p_fiscal_year;
  END IF;

  UPDATE public.assembly_year_closures
  SET
    status = 'unlocked',
    unlocked_at = NOW(),
    unlocked_by = auth.uid(),
    unlock_reason = btrim(p_reason),
    updated_at = NOW()
  WHERE id = closure.id;

  INSERT INTO public.assembly_year_lock_events (
    closure_id,
    neighborhood_id,
    fiscal_year,
    revision,
    event_type,
    reason,
    actor_auth_id
  ) VALUES (
    closure.id,
    p_neighborhood_id,
    p_fiscal_year,
    closure.revision,
    'unlocked',
    btrim(p_reason),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'status', 'unlocked',
    'revision', closure.revision
  );
END;
$$;


ALTER FUNCTION "public"."unlock_assembly_year"("p_neighborhood_id" bigint, "p_fiscal_year" integer, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlock_fee_year"("p_neighborhood_id" bigint, "p_fiscal_year" integer, "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."unlock_fee_year"("p_neighborhood_id" bigint, "p_fiscal_year" integer, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_own_facility_reservation"("p_reservation_id" "uuid", "p_facility_id" bigint, "p_reservation_date" "date", "p_start_time" "text", "p_end_time" "text", "p_participant_count" integer, "p_applicant_name" "text", "p_usage_purpose" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_reservation public.facility_reservations%ROWTYPE;
  target_facility public.facilities%ROWTYPE;
  saved public.facility_reservations%ROWTYPE;
  normalized_start TIME;
  normalized_end TIME;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'LINE認証が必要です。'; END IF;

  SELECT * INTO target_reservation
  FROM public.facility_reservations reservation
  WHERE reservation.id = p_reservation_id
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION '修正する施設予約が見つかりません。'; END IF;

  IF NOT (
    target_reservation.user_auth_id::TEXT = auth.uid()::TEXT
    OR EXISTS (
      SELECT 1
      FROM public.resident_rosters roster
      WHERE roster.id = target_reservation.resident_roster_id
        AND (
          roster.user_auth_id::TEXT = auth.uid()::TEXT
          OR roster.family_user_auth_id_1::TEXT = auth.uid()::TEXT
          OR roster.family_user_auth_id_2::TEXT = auth.uid()::TEXT
        )
    )
  ) THEN
    RAISE EXCEPTION '本人が申し込んだ施設予約だけ修正できます。';
  END IF;

  IF p_reservation_date IS NULL OR NULLIF(BTRIM(p_start_time), '') IS NULL OR NULLIF(BTRIM(p_end_time), '') IS NULL THEN
    RAISE EXCEPTION '予約年月日と利用時間を入力してください。';
  END IF;
  IF COALESCE(p_participant_count, 0) <= 0 THEN RAISE EXCEPTION '利用人数を入力してください。'; END IF;
  IF NULLIF(BTRIM(p_usage_purpose), '') IS NULL THEN RAISE EXCEPTION '使用用途を入力してください。'; END IF;

  normalized_start := BTRIM(p_start_time)::TIME;
  normalized_end := BTRIM(p_end_time)::TIME;
  IF normalized_start >= normalized_end THEN RAISE EXCEPTION '終了時間は開始時間より後にしてください。'; END IF;

  SELECT * INTO target_facility
  FROM public.facilities facility
  WHERE facility.id = p_facility_id
    AND facility.neighborhood_id = target_reservation.neighborhood_id
    AND COALESCE(facility.is_active, TRUE)
  LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION '予約できる施設が見つかりません。'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(target_facility.id::TEXT || ':' || p_reservation_date::TEXT, 0));
  IF EXISTS (
    SELECT 1
    FROM public.facility_reservations existing
    WHERE existing.id <> target_reservation.id
      AND existing.facility_bigint_id = target_facility.id
      AND existing.reservation_date = p_reservation_date
      AND existing.status IN ('pending', 'approved')
      AND existing.start_time::TIME < normalized_end
      AND normalized_start < existing.end_time::TIME
  ) THEN
    RAISE EXCEPTION 'この施設・日付・時間帯は既に予約されています。別の時間を選択してください。';
  END IF;

  UPDATE public.facility_reservations
  SET facility_bigint_id = target_facility.id,
      facility_name = COALESCE(target_facility.name, '施設'),
      title = COALESCE(target_facility.name, '施設'),
      applicant_name = NULLIF(BTRIM(p_applicant_name), ''),
      resident_name = NULLIF(BTRIM(p_applicant_name), ''),
      participant_count = p_participant_count,
      people_count = p_participant_count,
      num_people = p_participant_count,
      reservation_date = p_reservation_date,
      start_time = normalized_start,
      end_time = normalized_end,
      usage_purpose = NULLIF(BTRIM(p_usage_purpose), ''),
      status = 'pending',
      updated_at = NOW()
  WHERE id = target_reservation.id
  RETURNING * INTO saved;

  RETURN to_jsonb(saved);
END;
$$;


ALTER FUNCTION "public"."update_own_facility_reservation"("p_reservation_id" "uuid", "p_facility_id" bigint, "p_reservation_date" "date", "p_start_time" "text", "p_end_time" "text", "p_participant_count" integer, "p_applicant_name" "text", "p_usage_purpose" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assembly_budgets" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "category_id" bigint NOT NULL,
    "budget_amount" integer DEFAULT 0 NOT NULL,
    "previous_budget_amount" integer DEFAULT 0 NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."assembly_budgets" OWNER TO "postgres";


ALTER TABLE "public"."assembly_budgets" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."assembly_budgets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assembly_categories" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" bigint,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "sort_order" integer DEFAULT 0,
    "fiscal_year" integer,
    "is_standard" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    CONSTRAINT "assembly_categories_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."assembly_categories" OWNER TO "postgres";


ALTER TABLE "public"."assembly_categories" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."assembly_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assembly_record_correction_audit" (
    "id" bigint NOT NULL,
    "closure_id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "text",
    "operation" "text" NOT NULL,
    "before_data" "jsonb",
    "after_data" "jsonb",
    "actor_auth_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assembly_record_correction_audit_operation_check" CHECK (("operation" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"]))),
    CONSTRAINT "assembly_record_correction_audit_table_name_check" CHECK (("table_name" = ANY (ARRAY['assembly_budgets'::"text", 'assembly_settlements'::"text"])))
);


ALTER TABLE "public"."assembly_record_correction_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."assembly_record_correction_audit" IS '代表者が確定解除後に行った総会会計データの訂正履歴。';



ALTER TABLE "public"."assembly_record_correction_audit" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assembly_record_correction_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assembly_settlements" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "category_id" bigint,
    "amount" integer DEFAULT 0 NOT NULL,
    "paid_date" "date" NOT NULL,
    "description" "text",
    "receipt_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "type" "text",
    "receipt_name" "text",
    "source_type" "text",
    "source_id" "text"
);


ALTER TABLE "public"."assembly_settlements" OWNER TO "postgres";


COMMENT ON COLUMN "public"."assembly_settlements"."source_type" IS '自動計上元の種類。Stripe手数料はstripe_fee。';



COMMENT ON COLUMN "public"."assembly_settlements"."source_id" IS '自動計上元の一意ID。Stripe手数料は残高取引ID。';



ALTER TABLE "public"."assembly_settlements" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."assembly_settlements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assembly_standard_categories" (
    "id" bigint NOT NULL,
    "type" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "assembly_standard_categories_type_check" CHECK (("type" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."assembly_standard_categories" OWNER TO "postgres";


ALTER TABLE "public"."assembly_standard_categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assembly_standard_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assembly_year_closures" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "status" "text" DEFAULT 'locked'::"text" NOT NULL,
    "revision" integer DEFAULT 1 NOT NULL,
    "locked_at" timestamp with time zone,
    "locked_by" "uuid",
    "unlocked_at" timestamp with time zone,
    "unlocked_by" "uuid",
    "unlock_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assembly_year_closures_fiscal_year_check" CHECK ((("fiscal_year" >= 2000) AND ("fiscal_year" <= 2200))),
    CONSTRAINT "assembly_year_closures_revision_check" CHECK (("revision" > 0)),
    CONSTRAINT "assembly_year_closures_status_check" CHECK (("status" = ANY (ARRAY['locked'::"text", 'unlocked'::"text"])))
);


ALTER TABLE "public"."assembly_year_closures" OWNER TO "postgres";


COMMENT ON TABLE "public"."assembly_year_closures" IS '町内会・自治会ごとの総会会計年度確定状態。';



ALTER TABLE "public"."assembly_year_closures" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assembly_year_closures_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assembly_year_lock_events" (
    "id" bigint NOT NULL,
    "closure_id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "revision" integer NOT NULL,
    "event_type" "text" NOT NULL,
    "reason" "text",
    "actor_auth_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assembly_year_lock_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['locked'::"text", 'unlocked'::"text", 'relocked'::"text"])))
);


ALTER TABLE "public"."assembly_year_lock_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."assembly_year_lock_events" IS '総会会計年度の確定・解除・再確定履歴。';



ALTER TABLE "public"."assembly_year_lock_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assembly_year_lock_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."assembly_year_snapshots" (
    "id" bigint NOT NULL,
    "closure_id" bigint NOT NULL,
    "revision" integer NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "categories" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "budgets" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "settlements" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "fee_rows" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "fee_revenue" numeric DEFAULT 0 NOT NULL,
    "captured_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "assembly_year_snapshots_fiscal_year_check" CHECK ((("fiscal_year" >= 2000) AND ("fiscal_year" <= 2200))),
    CONSTRAINT "assembly_year_snapshots_revision_check" CHECK (("revision" > 0))
);


ALTER TABLE "public"."assembly_year_snapshots" OWNER TO "postgres";


COMMENT ON TABLE "public"."assembly_year_snapshots" IS '総会会計年度確定時点の科目・予算・決算明細・会費連携データの改版スナップショット。';



ALTER TABLE "public"."assembly_year_snapshots" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."assembly_year_snapshots_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."circulars" (
    "id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "author" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'info'::"text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "neighborhood_id" bigint DEFAULT 1,
    "is_pushed" boolean DEFAULT false,
    "event_time" "text",
    "deleted_at" timestamp with time zone,
    "facility_id" "uuid",
    "event_url" "text",
    "parent_circular_id" bigint,
    "proxy_text" "text" DEFAULT '私は、本総会における決議に関する一切の権限を、議長に委任いたします。'::"text",
    "author_name" "text",
    "body" "text",
    "attachment_url" "text",
    "image_url" "text",
    "pdf_url" "text",
    "event_date" timestamp with time zone,
    "meeting_at" timestamp with time zone,
    "requires_reply" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "proxy_template_text" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "circulars_category_check" CHECK (("category" = ANY (ARRAY['circular'::"text", 'notice'::"text", 'info'::"text", 'event'::"text", 'assembly'::"text"])))
);


ALTER TABLE "public"."circulars" OWNER TO "postgres";


COMMENT ON COLUMN "public"."circulars"."category" IS '発信種別。circular=電子回覧板、notice/info=連絡、event=イベント、assembly=総会通知。';



COMMENT ON COLUMN "public"."circulars"."attachments" IS '発信に添付した画像/PDFのURL、ファイル名、MIME種別を格納するJSON配列。';



COMMENT ON COLUMN "public"."circulars"."is_pushed" IS 'trueの場合、LINEへプッシュ通知メッセージを送信する対象。falseの場合、電子掲示板への掲示のみ。';



COMMENT ON COLUMN "public"."circulars"."event_time" IS 'イベント・総会の時間表示用テキスト。例: 午前10時から、受付9:30／開始10:00、書面開催。';



COMMENT ON COLUMN "public"."circulars"."proxy_template_text" IS '総会通知で会員に提示する委任状の定型本文。欠席返信時に会員が日付・名前とともに返信する。';



ALTER TABLE "public"."circulars" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."circulars_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."era_mappings" (
    "id" integer NOT NULL,
    "era_name" character varying(10) NOT NULL,
    "start_year" integer NOT NULL,
    "end_year" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."era_mappings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."era_mappings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."era_mappings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."era_mappings_id_seq" OWNED BY "public"."era_mappings"."id";



CREATE TABLE IF NOT EXISTS "public"."event_applications" (
    "id" bigint NOT NULL,
    "circular_id" bigint,
    "resident_name" "text" NOT NULL,
    "applied_at" timestamp with time zone DEFAULT "now"(),
    "adult_count" integer DEFAULT 1,
    "child_count" integer DEFAULT 0,
    "user_auth_id" "uuid",
    "reply_status" "text",
    "proxy_file_url" "text",
    "proxy_date" "text",
    "proxy_signer" "text",
    "proxy_agent" "text",
    "event_id" bigint,
    "assembly_notice_id" bigint,
    "neighborhood_id" bigint,
    "roster_id" "text",
    "response_status" "text",
    "adults" integer DEFAULT 0,
    "children" integer DEFAULT 0,
    "proxy_url" "text",
    "attachment_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "proxy_text" "text",
    "proxy_signed_date" "date",
    "proxy_signer_name" "text",
    "proxy_agent_name" "text"
);


ALTER TABLE "public"."event_applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."event_applications" IS 'イベント参加返信と総会出欠返信を保存する。総会欠席時はproxy_text/proxy_signed_date/proxy_signer_name/proxy_agent_nameに委任状内容を保存し、従来添付がある場合はproxy_file_urlにも保存する。';



COMMENT ON COLUMN "public"."event_applications"."roster_id" IS 'resident_rosters.id。UUIDおよび旧数値IDとの互換性のためTEXTで保持する。';



COMMENT ON COLUMN "public"."event_applications"."proxy_text" IS '欠席返信時に会員が入力した委任状本文。';



COMMENT ON COLUMN "public"."event_applications"."proxy_signed_date" IS '委任状に記載する日付。';



COMMENT ON COLUMN "public"."event_applications"."proxy_signer_name" IS '委任状に記載する本人名。';



COMMENT ON COLUMN "public"."event_applications"."proxy_agent_name" IS '委任状に記載する代理人名。入力がない場合はPDFに代理人欄を表示しない。';



ALTER TABLE "public"."event_applications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."event_applications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."facilities" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint,
    "name" "text" NOT NULL,
    "location" "text",
    "capacity" "text",
    "scale" "text",
    "available_hours" "text",
    "available_start_time" time without time zone,
    "available_end_time" time without time zone,
    "unavailable_weekdays" "text"[] DEFAULT '{}'::"text"[],
    "unavailable_dates" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."facilities" OWNER TO "postgres";


ALTER TABLE "public"."facilities" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."facilities_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."facility_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "facility_id" "uuid",
    "neighborhood_id" bigint NOT NULL,
    "resident_roster_id" "uuid",
    "title" "text" NOT NULL,
    "reservation_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "applicant_name" "text" NOT NULL,
    "num_people" integer DEFAULT 1 NOT NULL,
    "status" "text" NOT NULL,
    "event_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "circular_id" bigint,
    "roster_id" bigint,
    "user_auth_id" "text",
    "facility_name" "text",
    "resident_name" "text",
    "participant_count" integer DEFAULT 1,
    "people_count" integer DEFAULT 1,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "facility_bigint_id" bigint,
    "usage_purpose" "text",
    CONSTRAINT "facility_reservations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."facility_reservations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."facility_reservations"."usage_purpose" IS '施設の使用用途。例: 役員会、子ども会、交流会。';



CREATE TABLE IF NOT EXISTS "public"."fee_billings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "neighborhood_id" bigint,
    "roster_id" "uuid",
    "amount" integer NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "stripe_payment_intent_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "full_name" "text",
    "kana_name" "text",
    "postal_code" "text",
    "address2" "text",
    "address3" "text",
    CONSTRAINT "fee_billings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."fee_billings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_finalizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "neighborhood_id" bigint,
    "fiscal_year" integer NOT NULL,
    "finalized_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fee_finalizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_record_correction_audit" (
    "id" bigint NOT NULL,
    "closure_id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "fee_record_id" "text" NOT NULL,
    "operation" "text" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "actor_auth_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fee_record_correction_audit_operation_check" CHECK (("operation" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."fee_record_correction_audit" OWNER TO "postgres";


COMMENT ON TABLE "public"."fee_record_correction_audit" IS '代表者が確定解除後に行った会費訂正履歴。';



CREATE SEQUENCE IF NOT EXISTS "public"."fee_record_correction_audit_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."fee_record_correction_audit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."fee_record_correction_audit_id_seq" OWNED BY "public"."fee_record_correction_audit"."id";



CREATE TABLE IF NOT EXISTS "public"."fee_records" (
    "id" bigint NOT NULL,
    "roster_id" "uuid",
    "year" integer NOT NULL,
    "paid_amount" integer DEFAULT 0,
    "unpaid_amount" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expected_amount" integer NOT NULL,
    "paid_amount_cash" integer DEFAULT 0 NOT NULL,
    "paid_amount_stripe" integer DEFAULT 0 NOT NULL,
    "paid_at" timestamp with time zone,
    "is_requested" boolean DEFAULT false,
    "full_name" "text",
    "kana_name" "text",
    "postal_code" "text",
    "address2" "text",
    "address3" "text",
    "stripe_balance_transaction_id" "text",
    "stripe_fee_amount" integer DEFAULT 0,
    "stripe_net_amount" integer DEFAULT 0,
    "neighborhood_id" bigint NOT NULL,
    "resident_name" "text" NOT NULL,
    "fiscal_year" integer NOT NULL,
    "billing_amount" integer,
    "amount" integer,
    "billing_channel" "text" DEFAULT 'manual'::"text",
    "payment_method" "text",
    "last_payment_method" "text",
    "billing_status" "text" DEFAULT 'billed'::"text",
    "status" "text" DEFAULT 'unpaid'::"text",
    "is_billed" boolean DEFAULT true,
    "billed_at" timestamp with time zone,
    "stripe_payment_intent_id" "text",
    "roster_id_snapshot" "text",
    "member_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "cash_collection_requested" boolean DEFAULT false NOT NULL,
    CONSTRAINT "fee_records_expected_amount_valid" CHECK (("expected_amount" >= 0)),
    CONSTRAINT "fee_records_fiscal_year_valid" CHECK ((("fiscal_year" >= 2000) AND ("fiscal_year" <= 2200))),
    CONSTRAINT "fee_records_paid_amount_valid" CHECK (((COALESCE("paid_amount", 0) >= 0) AND (COALESCE("paid_amount_cash", 0) >= 0) AND (COALESCE("paid_amount_stripe", 0) >= 0))),
    CONSTRAINT "fee_records_resident_name_required" CHECK (("length"("btrim"("resident_name")) > 0))
);


ALTER TABLE "public"."fee_records" OWNER TO "postgres";


COMMENT ON COLUMN "public"."fee_records"."roster_id" IS '請求対象世帯のresident_rosters.id。必須。';



COMMENT ON COLUMN "public"."fee_records"."stripe_balance_transaction_id" IS 'Stripe残高取引ID。手数料・差引額の照合に使用する。';



COMMENT ON COLUMN "public"."fee_records"."stripe_fee_amount" IS 'Stripeが残高取引で控除した実手数料。';



COMMENT ON COLUMN "public"."fee_records"."stripe_net_amount" IS 'Stripe決済総額から手数料を控除した差引額。';



COMMENT ON COLUMN "public"."fee_records"."neighborhood_id" IS '対象世帯の町内会・自治会ID。名簿から自動設定。';



COMMENT ON COLUMN "public"."fee_records"."resident_name" IS '請求作成時点の世帯主氏名スナップショット。';



COMMENT ON COLUMN "public"."fee_records"."fiscal_year" IS '会費の対象年度。';



COMMENT ON COLUMN "public"."fee_records"."cash_collection_requested" IS '会員世帯が役員による集金を希望したか。入金の記録とは別に管理する。';



ALTER TABLE "public"."fee_records" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."fee_records_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."fee_stripe_customers" (
    "stripe_account_id" "text" NOT NULL,
    "roster_id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL
);


ALTER TABLE "public"."fee_stripe_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_stripe_payments" (
    "stripe_payment_intent_id" "text" NOT NULL,
    "fee_record_id" "text" NOT NULL,
    "amount" bigint NOT NULL,
    "paid_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fee_stripe_payments_amount_check" CHECK (("amount" > 0))
);


ALTER TABLE "public"."fee_stripe_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_stripe_sessions" (
    "fee_record_id" "text" NOT NULL,
    "stripe_account_id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "stripe_session_id" "text" NOT NULL,
    "bank_account_snapshot" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."fee_stripe_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fee_year_closures" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "status" "text" DEFAULT 'locked'::"text" NOT NULL,
    "revision" integer DEFAULT 1 NOT NULL,
    "locked_at" timestamp with time zone,
    "locked_by" "uuid",
    "unlocked_at" timestamp with time zone,
    "unlocked_by" "uuid",
    "unlock_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fee_year_closures_fiscal_year_check" CHECK ((("fiscal_year" >= 2000) AND ("fiscal_year" <= 2200))),
    CONSTRAINT "fee_year_closures_revision_check" CHECK (("revision" >= 1)),
    CONSTRAINT "fee_year_closures_status_check" CHECK (("status" = ANY (ARRAY['locked'::"text", 'unlocked'::"text"])))
);


ALTER TABLE "public"."fee_year_closures" OWNER TO "postgres";


COMMENT ON TABLE "public"."fee_year_closures" IS '町内会・自治会ごとの会費年度確定状態。';



CREATE SEQUENCE IF NOT EXISTS "public"."fee_year_closures_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."fee_year_closures_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."fee_year_closures_id_seq" OWNED BY "public"."fee_year_closures"."id";



CREATE TABLE IF NOT EXISTS "public"."fee_year_lock_events" (
    "id" bigint NOT NULL,
    "closure_id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "revision" integer NOT NULL,
    "event_type" "text" NOT NULL,
    "reason" "text",
    "actor_auth_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fee_year_lock_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['locked'::"text", 'unlocked'::"text", 'relocked'::"text"])))
);


ALTER TABLE "public"."fee_year_lock_events" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."fee_year_lock_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."fee_year_lock_events_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."fee_year_lock_events_id_seq" OWNED BY "public"."fee_year_lock_events"."id";



CREATE TABLE IF NOT EXISTS "public"."fee_year_post_lock_payments" (
    "id" bigint NOT NULL,
    "closure_id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "fee_record_id" "text" NOT NULL,
    "stripe_checkout_session_id" "text",
    "stripe_payment_intent_id" "text",
    "amount" integer NOT NULL,
    "status" "text" DEFAULT 'pending_review'::"text" NOT NULL,
    "payment_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "fee_year_post_lock_payments_amount_check" CHECK (("amount" >= 0)),
    CONSTRAINT "fee_year_post_lock_payments_status_check" CHECK (("status" = ANY (ARRAY['pending_review'::"text", 'reviewed'::"text"])))
);


ALTER TABLE "public"."fee_year_post_lock_payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."fee_year_post_lock_payments" IS '年度確定直前に作成済みだった決済画面から確定後に届いた入金。確定データは変更せず個別保管する。';



CREATE SEQUENCE IF NOT EXISTS "public"."fee_year_post_lock_payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."fee_year_post_lock_payments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."fee_year_post_lock_payments_id_seq" OWNED BY "public"."fee_year_post_lock_payments"."id";



CREATE TABLE IF NOT EXISTS "public"."fee_year_snapshot_rows" (
    "id" bigint NOT NULL,
    "closure_id" bigint NOT NULL,
    "revision" integer NOT NULL,
    "fee_record_id" "text" NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "fiscal_year" integer NOT NULL,
    "roster_id_snapshot" "text",
    "resident_name" "text" NOT NULL,
    "resident_kana" "text",
    "postal_code" "text",
    "address_text" "text",
    "billing_amount" integer DEFAULT 0 NOT NULL,
    "paid_amount" integer DEFAULT 0 NOT NULL,
    "paid_amount_cash" integer DEFAULT 0 NOT NULL,
    "paid_amount_stripe" integer DEFAULT 0 NOT NULL,
    "payment_method" "text",
    "payment_status" "text",
    "fee_data" "jsonb" NOT NULL,
    "member_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "captured_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "captured_by" "uuid",
    CONSTRAINT "fee_year_snapshot_rows_revision_check" CHECK (("revision" >= 1))
);


ALTER TABLE "public"."fee_year_snapshot_rows" OWNER TO "postgres";


COMMENT ON TABLE "public"."fee_year_snapshot_rows" IS '年度確定時点の会費・会員情報を独立保存する改版スナップショット。';



CREATE SEQUENCE IF NOT EXISTS "public"."fee_year_snapshot_rows_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."fee_year_snapshot_rows_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."fee_year_snapshot_rows_id_seq" OWNED BY "public"."fee_year_snapshot_rows"."id";



CREATE TABLE IF NOT EXISTS "public"."line_push_logs" (
    "id" integer NOT NULL,
    "neighborhood_id" integer,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "recipient_count" integer DEFAULT 1 NOT NULL,
    "category" "text"
);


ALTER TABLE "public"."line_push_logs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."line_push_logs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."line_push_logs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."line_push_logs_id_seq" OWNED BY "public"."line_push_logs"."id";



CREATE TABLE IF NOT EXISTS "public"."live_session_applications" (
    "id" bigint NOT NULL,
    "live_session_id" bigint,
    "session_id" bigint,
    "neighborhood_id" bigint,
    "roster_id" bigint,
    "user_auth_id" "text",
    "resident_name" "text",
    "applicant_name" "text",
    "participant_count" integer DEFAULT 1,
    "people_count" integer DEFAULT 1,
    "reply_status" "text" DEFAULT 'attend'::"text",
    "response_status" "text" DEFAULT 'attend'::"text",
    "status" "text" DEFAULT 'attend'::"text",
    "applied_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "resident_roster_id" "uuid"
);


ALTER TABLE "public"."live_session_applications" OWNER TO "postgres";


ALTER TABLE "public"."live_session_applications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."live_session_applications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."live_sessions" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint,
    "provider" "text" DEFAULT 'line'::"text",
    "title" "text" NOT NULL,
    "content" "text",
    "description" "text",
    "event_date" "date",
    "event_time" "text",
    "starts_at" timestamp with time zone,
    "meeting_url" "text",
    "live_url" "text",
    "event_url" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "is_pushed" boolean DEFAULT false,
    "published_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_sessions" OWNER TO "postgres";


ALTER TABLE "public"."live_sessions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."live_sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."membership_fee_standard_applications" (
    "id" bigint NOT NULL,
    "standard_version_id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "before_settings" "jsonb",
    "after_settings" "jsonb" NOT NULL,
    "application_type" "text" NOT NULL,
    "applied_by" "uuid" DEFAULT "auth"."uid"(),
    "applied_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "membership_fee_standard_applications_application_type_check" CHECK (("application_type" = ANY (ARRAY['new_neighborhood'::"text", 'initial_backfill'::"text", 'manual'::"text"])))
);


ALTER TABLE "public"."membership_fee_standard_applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."membership_fee_standard_applications" IS '会費標準設定を団体へ適用した履歴。';



ALTER TABLE "public"."membership_fee_standard_applications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."membership_fee_standard_applications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."membership_fee_standard_versions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."membership_fee_standard_versions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."neighborhood_admins" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint,
    "admin_auth_id" "uuid",
    "admin_name" "text" NOT NULL,
    "admin_email" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "admin_role" "text",
    "admin_invite_token" "text",
    "invite_token" "text",
    "invited_at" timestamp with time zone,
    "retired_at" timestamp with time zone,
    CONSTRAINT "neighborhood_admins_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'waiting_approval'::"text", 'rejected'::"text", 'retired'::"text"])))
);


ALTER TABLE "public"."neighborhood_admins" OWNER TO "postgres";


COMMENT ON COLUMN "public"."neighborhood_admins"."admin_role" IS '役員の役職。例: 会長、副会長、会計。';



COMMENT ON COLUMN "public"."neighborhood_admins"."admin_invite_token" IS '役員候補者ごとの招待URL用トークン。候補者が認証して参加するとNULLに戻す。';



COMMENT ON COLUMN "public"."neighborhood_admins"."invite_token" IS '旧/互換用の役員招待トークン。admin_invite_tokenと同じ値を保存する。';



COMMENT ON COLUMN "public"."neighborhood_admins"."invited_at" IS '役員候補者へ招待URLを作成した日時。';



COMMENT ON COLUMN "public"."neighborhood_admins"."retired_at" IS '役員が退任した日時。復活時はNULLに戻す。';



ALTER TABLE "public"."neighborhood_admins" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."neighborhood_admins_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."neighborhood_commercial_disclosures" (
    "neighborhood_id" bigint NOT NULL,
    "publication_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "seller_name" "text" NOT NULL,
    "representative_name" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "address" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "email" "text" NOT NULL,
    "fee_name" "text" NOT NULL,
    "fee_amount" integer NOT NULL,
    "additional_fees" "text" NOT NULL,
    "payment_methods" "text" NOT NULL,
    "payment_timing" "text" NOT NULL,
    "service_timing" "text" NOT NULL,
    "application_period" "text" NOT NULL,
    "cancellation_refund" "text" NOT NULL,
    "business_hours" "text",
    "published_at" timestamp with time zone,
    "withdrawn_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "neighborhood_commercial_disclosures_fee_amount_check" CHECK (("fee_amount" >= 0)),
    CONSTRAINT "neighborhood_commercial_disclosures_publication_status_check" CHECK (("publication_status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'withdrawn'::"text"])))
);


ALTER TABLE "public"."neighborhood_commercial_disclosures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."neighborhood_fee_settings" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "standard_version_id" bigint,
    "fee_name" "text" DEFAULT '年会費'::"text" NOT NULL,
    "amount" integer DEFAULT 3000 NOT NULL,
    "fiscal_year_start_month" integer DEFAULT 4 NOT NULL,
    "billing_frequency" "text" DEFAULT 'annual'::"text" NOT NULL,
    "billing_target" "text" DEFAULT 'active_households'::"text" NOT NULL,
    "cash_enabled" boolean DEFAULT true NOT NULL,
    "stripe_card_enabled" boolean DEFAULT true NOT NULL,
    "revenue_category" "text" DEFAULT '会費'::"text" NOT NULL,
    "overridden_fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "applied_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bank_transfer_enabled" boolean DEFAULT false NOT NULL,
    "paypay_enabled" boolean DEFAULT false NOT NULL,
    "bank_name" "text",
    "bank_branch_name" "text",
    "bank_account_type" "text",
    "bank_account_number" "text",
    "bank_account_holder" "text",
    "paypay_display_name" "text",
    "paypay_payment_url" "text",
    "payment_instructions" "text",
    "stripe_paypay_enabled" boolean DEFAULT false NOT NULL,
    "stripe_bank_transfer_enabled" boolean DEFAULT false NOT NULL,
    CONSTRAINT "neighborhood_fee_settings_amount_check" CHECK (("amount" >= 0)),
    CONSTRAINT "neighborhood_fee_settings_bank_account_type_check" CHECK ((("bank_account_type" IS NULL) OR ("bank_account_type" = ANY (ARRAY['ordinary'::"text", 'checking'::"text"])))),
    CONSTRAINT "neighborhood_fee_settings_billing_frequency_check" CHECK (("billing_frequency" = 'annual'::"text")),
    CONSTRAINT "neighborhood_fee_settings_billing_target_check" CHECK (("billing_target" = 'active_households'::"text")),
    CONSTRAINT "neighborhood_fee_settings_fiscal_year_start_month_check" CHECK ((("fiscal_year_start_month" >= 1) AND ("fiscal_year_start_month" <= 12))),
    CONSTRAINT "neighborhood_fee_settings_payment_method_check" CHECK (("cash_enabled" OR "stripe_card_enabled" OR "stripe_bank_transfer_enabled" OR "stripe_paypay_enabled" OR "bank_transfer_enabled"))
);


ALTER TABLE "public"."neighborhood_fee_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."neighborhood_fee_settings" IS '町内会・自治会ごとの会費設定。標準版と団体独自上書きを保持する。';



COMMENT ON COLUMN "public"."neighborhood_fee_settings"."bank_transfer_enabled" IS '団体が会費の直接口座振込を受け付ける場合にtrue。Stripeの入金先口座とは別。';



COMMENT ON COLUMN "public"."neighborhood_fee_settings"."paypay_enabled" IS '旧外部PayPay案内用。Stripe PayPayでは使用しない。';



COMMENT ON COLUMN "public"."neighborhood_fee_settings"."bank_account_number" IS '会員へ案内する団体の会費受取口座番号。RLSにより同一団体の会員と役員だけが参照する。';



COMMENT ON COLUMN "public"."neighborhood_fee_settings"."paypay_payment_url" IS '旧外部PayPay案内URL。Stripe PayPayでは使用しない。';



COMMENT ON COLUMN "public"."neighborhood_fee_settings"."payment_instructions" IS '会員へ表示する団体独自の支払期限・注意事項。';



COMMENT ON COLUMN "public"."neighborhood_fee_settings"."stripe_paypay_enabled" IS 'Stripe ConnectのPayPay capabilityが有効で、運営承認済みの場合にtrue。会員画面のCheckout表示に使用する。';



ALTER TABLE "public"."neighborhood_fee_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."neighborhood_fee_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."neighborhood_payment_change_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "request_type" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "requested_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "requested_by" "uuid",
    "reviewed_by" "text",
    "review_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "neighborhood_payment_change_requests_request_type_check" CHECK (("request_type" = ANY (ARRAY['enable_paypay'::"text", 'update_paypay'::"text", 'disable_paypay'::"text"]))),
    CONSTRAINT "neighborhood_payment_change_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."neighborhood_payment_change_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."neighborhoods" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "prefecture" "text",
    "households" integer,
    "admin_name" "text",
    "admin_email" "text",
    "status" "text" DEFAULT 'active'::"text",
    "admin_auth_id" "uuid",
    "invite_token" "uuid" DEFAULT "gen_random_uuid"(),
    "postal_code" character varying(10),
    "lat" numeric(10,7),
    "lng" numeric(10,7),
    "stripe_account_id" "text",
    "stripe_mode" "text" DEFAULT 'test'::"text",
    "fiscal_start_month" integer DEFAULT 4,
    "contract_agreed" boolean DEFAULT false,
    "contract_agreed_at" timestamp with time zone,
    "contract_signatory" "text",
    "stripe_account_mode" "text" DEFAULT 'live'::"text",
    "stripe_onboarding_status" "text" DEFAULT 'pending'::"text",
    "stripe_charges_enabled" boolean DEFAULT false,
    "stripe_payouts_enabled" boolean DEFAULT false,
    "stripe_details_submitted" boolean DEFAULT false,
    "stripe_account_updated_at" timestamp with time zone,
    "stripe_paypay_status" "text" DEFAULT 'not_requested'::"text" NOT NULL,
    "stripe_paypay_last_error" "text",
    "stripe_paypay_updated_at" timestamp with time zone,
    CONSTRAINT "chk_fiscal_start_month" CHECK ((("fiscal_start_month" >= 1) AND ("fiscal_start_month" <= 12))),
    CONSTRAINT "neighborhoods_stripe_mode_check" CHECK (("stripe_mode" = ANY (ARRAY['test'::"text", 'live'::"text"]))),
    CONSTRAINT "neighborhoods_stripe_paypay_status_check" CHECK (("stripe_paypay_status" = ANY (ARRAY['not_requested'::"text", 'pending'::"text", 'active'::"text", 'inactive'::"text", 'restricted'::"text"])))
);


ALTER TABLE "public"."neighborhoods" OWNER TO "postgres";


ALTER TABLE "public"."neighborhoods" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."neighborhoods_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."platform_payments" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "year_month" character varying(7) NOT NULL,
    "paid_amount" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_payments" OWNER TO "postgres";


ALTER TABLE "public"."platform_payments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."platform_payments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."public_posts" (
    "id" bigint NOT NULL,
    "user_auth_id" "uuid",
    "neighborhood_id" bigint,
    "nickname" "text" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text",
    "location_info" "text",
    "event_date" "date",
    "content" "text" NOT NULL,
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "public_posts_category_check" CHECK (("category" = ANY (ARRAY['food'::"text", 'sight'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."public_posts" OWNER TO "postgres";


ALTER TABLE "public"."public_posts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."public_posts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."read_receipts" (
    "id" bigint NOT NULL,
    "circular_id" bigint,
    "resident_name" "text" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"(),
    "user_auth_id" "uuid"
);


ALTER TABLE "public"."read_receipts" OWNER TO "postgres";


ALTER TABLE "public"."read_receipts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."read_receipts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."reservable_facilities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "available_start_time" time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    "available_end_time" time without time zone DEFAULT '21:00:00'::time without time zone NOT NULL,
    "disabled_wdays" integer[] DEFAULT '{}'::integer[] NOT NULL,
    "disabled_dates" "date"[] DEFAULT '{}'::"date"[] NOT NULL,
    "custom_type" "text",
    CONSTRAINT "reservable_facilities_type_check" CHECK (("type" = ANY (ARRAY['facility'::"text", 'meeting'::"text", 'broadcast'::"text"])))
);


ALTER TABLE "public"."reservable_facilities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."resident_rosters" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "neighborhood_id" bigint,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    "first_name" "text",
    "chome" "text",
    "banchi" "text",
    "room_number" "text",
    "user_auth_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "postal_code" "text",
    "line_user_id" "text",
    "full_name" "text",
    "address2" "text",
    "address3" "text",
    "kana_name" "text",
    "family_user_auth_id_1" "text",
    "family_user_auth_id_2" "text",
    "family_name_1" "text",
    "family_name_2" "text",
    "withdrawal_status" "text",
    "family_line_user_id_1" "text",
    "family_line_user_id_2" "text",
    "family_kana_name_1" "text",
    "family_kana_name_2" "text",
    "family_invite_token_1" "text",
    "family_invite_token_2" "text",
    "family_invited_at_1" timestamp with time zone,
    "family_invited_at_2" timestamp with time zone,
    "family_withdrawal_status_1" "text" DEFAULT 'active'::"text",
    "family_withdrawal_status_2" "text" DEFAULT 'active'::"text"
);


ALTER TABLE "public"."resident_rosters" OWNER TO "postgres";


COMMENT ON COLUMN "public"."resident_rosters"."line_user_id" IS '本人のLINE Messaging API送信用ユーザーID。';



COMMENT ON COLUMN "public"."resident_rosters"."family_line_user_id_1" IS '家族1のLINE Messaging API送信用ユーザーID。';



COMMENT ON COLUMN "public"."resident_rosters"."family_line_user_id_2" IS '家族2のLINE Messaging API送信用ユーザーID。';



COMMENT ON COLUMN "public"."resident_rosters"."family_kana_name_1" IS '同一世帯の家族1名目のカタカナ氏名。LINE連携時の照合情報。';



COMMENT ON COLUMN "public"."resident_rosters"."family_kana_name_2" IS '同一世帯の家族2名目のカタカナ氏名。LINE連携時の照合情報。';



COMMENT ON COLUMN "public"."resident_rosters"."family_invite_token_1" IS '廃止済み。2026-07-24以降は家族招待URLを発行しない。';



COMMENT ON COLUMN "public"."resident_rosters"."family_invite_token_2" IS '廃止済み。2026-07-24以降は家族招待URLを発行しない。';



COMMENT ON COLUMN "public"."resident_rosters"."family_invited_at_1" IS '廃止済み。家族招待URLの旧履歴列。';



COMMENT ON COLUMN "public"."resident_rosters"."family_invited_at_2" IS '廃止済み。家族招待URLの旧履歴列。';



COMMENT ON COLUMN "public"."resident_rosters"."family_withdrawal_status_1" IS '家族1固有の退会状態。世帯主の状態とは独立。';



COMMENT ON COLUMN "public"."resident_rosters"."family_withdrawal_status_2" IS '家族2固有の退会状態。世帯主の状態とは独立。';



CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint,
    "push_unit_price" integer DEFAULT 5,
    "free_push_limit" integer DEFAULT 200,
    "annual_fee_amount" integer DEFAULT 3000,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "push_cost_price" numeric DEFAULT 1.5,
    "monthly_household_price" numeric DEFAULT 0,
    "tax_rate" numeric(5,2) DEFAULT 10
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."system_settings"."monthly_household_price" IS 'システム利用料の接続数1件あたり月額単価。本人・家族アカウントのLINE連携数を対象にする。';



COMMENT ON COLUMN "public"."system_settings"."tax_rate" IS 'システム利用料の消費税率。例: 10。';



ALTER TABLE "public"."system_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."system_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."system_usage_bank_account" (
    "id" integer NOT NULL,
    "bank_name" "text" NOT NULL,
    "bank_branch_name" "text" NOT NULL,
    "bank_account_type" "text" NOT NULL,
    "bank_account_number" "text" NOT NULL,
    "bank_account_holder" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bank_code" "text",
    "bank_branch_code" "text",
    "issuer" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "system_usage_bank_account_bank_account_number_check" CHECK (("bank_account_number" ~ '^[0-9]{7}$'::"text")),
    CONSTRAINT "system_usage_bank_account_bank_account_type_check" CHECK (("bank_account_type" = ANY (ARRAY['ordinary'::"text", 'checking'::"text"]))),
    CONSTRAINT "system_usage_bank_account_bank_branch_code_check" CHECK ((("bank_branch_code" IS NULL) OR ("bank_branch_code" ~ '^[0-9]{3}$'::"text"))),
    CONSTRAINT "system_usage_bank_account_bank_code_check" CHECK ((("bank_code" IS NULL) OR ("bank_code" ~ '^[0-9]{4}$'::"text"))),
    CONSTRAINT "system_usage_bank_account_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."system_usage_bank_account" OWNER TO "postgres";


COMMENT ON COLUMN "public"."system_usage_bank_account"."bank_code" IS '金融機関コード4桁。先頭の0を保持する。';



COMMENT ON COLUMN "public"."system_usage_bank_account"."bank_branch_code" IS '支店コード3桁。先頭の0を保持する。';



COMMENT ON COLUMN "public"."system_usage_bank_account"."issuer" IS '請求書・領収書の発行元。郵便番号、住所、会社名、電話番号、適格請求書発行事業者登録番号。';



CREATE TABLE IF NOT EXISTS "public"."system_usage_billings" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint,
    "billing_month" "text" NOT NULL,
    "linked_account_count" integer DEFAULT 0,
    "push_count" integer DEFAULT 0,
    "free_push_limit" integer DEFAULT 0,
    "push_overage_count" integer DEFAULT 0,
    "monthly_household_price" integer DEFAULT 0,
    "push_unit_price" integer DEFAULT 0,
    "subtotal_amount" integer DEFAULT 0,
    "tax_rate" numeric(5,2) DEFAULT 10,
    "tax_amount" integer DEFAULT 0,
    "total_amount" integer DEFAULT 0,
    "invoice_number" "text",
    "receipt_number" "text",
    "invoice_issued_at" timestamp with time zone,
    "due_date" timestamp with time zone,
    "status" "text" DEFAULT 'billed'::"text",
    "billed_at" timestamp with time zone DEFAULT "now"(),
    "paid_amount" integer DEFAULT 0,
    "payment_method" "text",
    "paid_at" timestamp with time zone,
    "stripe_checkout_session_id" "text",
    "stripe_payment_intent_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "snapshot_at" timestamp with time zone,
    "snapshot_source" "text",
    "stripe_customer_id" "text",
    "stripe_invoice_id" "text",
    "stripe_hosted_invoice_url" "text",
    "stripe_invoice_pdf_url" "text",
    "stripe_last_error" "text",
    "bank_account_snapshot" "jsonb",
    "rate_version_id" bigint,
    "rate_effective_month" "text",
    "issuer_snapshot" "jsonb"
);


ALTER TABLE "public"."system_usage_billings" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_usage_billings" IS 'el-townシステム利用料の月次請求。接続数、プッシュ超過、消費税を月ごとに固定して保存する。';



COMMENT ON COLUMN "public"."system_usage_billings"."billing_month" IS '請求対象月。YYYY-MM形式。';



COMMENT ON COLUMN "public"."system_usage_billings"."linked_account_count" IS '請求対象となるLINE連携アカウント数。本人・家族を含む。';



COMMENT ON COLUMN "public"."system_usage_billings"."push_overage_count" IS '無料プッシュ枠を超過した件数。';



COMMENT ON COLUMN "public"."system_usage_billings"."subtotal_amount" IS '税抜請求額。';



COMMENT ON COLUMN "public"."system_usage_billings"."tax_amount" IS '消費税額。';



COMMENT ON COLUMN "public"."system_usage_billings"."total_amount" IS '税込請求額。';



COMMENT ON COLUMN "public"."system_usage_billings"."invoice_number" IS '請求書番号。';



COMMENT ON COLUMN "public"."system_usage_billings"."receipt_number" IS '領収書番号。Stripe入金後に発番する。';



COMMENT ON COLUMN "public"."system_usage_billings"."invoice_issued_at" IS '請求書発行日。原則として利用月の翌月1日。';



COMMENT ON COLUMN "public"."system_usage_billings"."due_date" IS '支払期日。原則として利用月の翌月1日。';



COMMENT ON COLUMN "public"."system_usage_billings"."paid_amount" IS 'Stripeで入金された金額。';



COMMENT ON COLUMN "public"."system_usage_billings"."payment_method" IS '入金方法。システム利用料はstripeを想定する。';



COMMENT ON COLUMN "public"."system_usage_billings"."stripe_checkout_session_id" IS 'Stripe Checkout Session ID。';



COMMENT ON COLUMN "public"."system_usage_billings"."stripe_payment_intent_id" IS 'Stripe PaymentIntent ID。';



COMMENT ON COLUMN "public"."system_usage_billings"."snapshot_at" IS '接続数を固定した日時。原則として利用月16日。';



COMMENT ON COLUMN "public"."system_usage_billings"."snapshot_source" IS 'monthly_16th=16日定期固定、invoice_fallback=請求時の補完固定。';



COMMENT ON COLUMN "public"."system_usage_billings"."stripe_invoice_id" IS 'Stripe Invoice ID。カード自動決済と銀行振込で共通利用。';



COMMENT ON COLUMN "public"."system_usage_billings"."bank_account_snapshot" IS '銀行口座振込の請求発行時点の運営側振込先。後の口座変更で発行済み請求書は変更しない。';



COMMENT ON COLUMN "public"."system_usage_billings"."issuer_snapshot" IS '請求発行時の発行元。発行済み請求書・領収書では現在の設定で上書きしない。';



ALTER TABLE "public"."system_usage_billings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."system_usage_billings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."system_usage_payment_profiles" (
    "id" bigint NOT NULL,
    "neighborhood_id" bigint NOT NULL,
    "payment_method" "text",
    "stripe_customer_id" "text",
    "stripe_default_payment_method_id" "text",
    "card_setup_status" "text" DEFAULT 'not_started'::"text",
    "card_brand" "text",
    "card_last4" "text",
    "card_exp_month" integer,
    "card_exp_year" integer,
    "bank_transfer_status" "text",
    "billing_email" "text",
    "billing_contact_name" "text",
    "automatic_collection_consent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "bank_account_snapshot" "jsonb",
    CONSTRAINT "system_usage_payment_profiles_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['card'::"text", 'bank_transfer'::"text"])))
);


ALTER TABLE "public"."system_usage_payment_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_usage_payment_profiles" IS '町内会・自治会がel-townへ支払うシステム利用料のStripe顧客・決済方法。Connect受取口座とは別管理。';



COMMENT ON COLUMN "public"."system_usage_payment_profiles"."payment_method" IS 'card=Stripeカード自動決済、bank_transfer=Stripe顧客専用口座への銀行振込（自動消込）。発行済みの旧直接振込請求は変更しない。';



COMMENT ON COLUMN "public"."system_usage_payment_profiles"."stripe_customer_id" IS 'el-townプラットフォームStripeアカウント上のCustomer ID。';



COMMENT ON COLUMN "public"."system_usage_payment_profiles"."automatic_collection_consent_at" IS '団体管理者がカード自動決済を選択した日時。';



ALTER TABLE "public"."system_usage_payment_profiles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."system_usage_payment_profiles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."system_usage_rate_versions" (
    "id" bigint NOT NULL,
    "effective_month" "text" NOT NULL,
    "monthly_household_price" integer NOT NULL,
    "free_push_limit" integer NOT NULL,
    "push_unit_price" integer NOT NULL,
    "tax_rate" numeric(5,2) NOT NULL,
    "change_reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "system_usage_rate_versions_change_reason_check" CHECK ((("length"(TRIM(BOTH FROM "change_reason")) >= 1) AND ("length"(TRIM(BOTH FROM "change_reason")) <= 500))),
    CONSTRAINT "system_usage_rate_versions_effective_month_check" CHECK (("effective_month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'::"text")),
    CONSTRAINT "system_usage_rate_versions_free_push_limit_check" CHECK ((("free_push_limit" >= 0) AND ("free_push_limit" <= 100000000))),
    CONSTRAINT "system_usage_rate_versions_monthly_household_price_check" CHECK ((("monthly_household_price" >= 0) AND ("monthly_household_price" <= 100000000))),
    CONSTRAINT "system_usage_rate_versions_push_unit_price_check" CHECK ((("push_unit_price" >= 0) AND ("push_unit_price" <= 100000000))),
    CONSTRAINT "system_usage_rate_versions_tax_rate_check" CHECK ((("tax_rate" >= (0)::numeric) AND ("tax_rate" <= (100)::numeric)))
);


ALTER TABLE "public"."system_usage_rate_versions" OWNER TO "postgres";


ALTER TABLE "public"."system_usage_rate_versions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."system_usage_rate_versions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "display_name" "text" NOT NULL,
    "role" "text" DEFAULT 'resident'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['resident'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."era_mappings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."era_mappings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."fee_record_correction_audit" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."fee_record_correction_audit_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."fee_year_closures" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."fee_year_closures_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."fee_year_lock_events" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."fee_year_lock_events_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."fee_year_post_lock_payments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."fee_year_post_lock_payments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."fee_year_snapshot_rows" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."fee_year_snapshot_rows_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."line_push_logs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."line_push_logs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."assembly_budgets"
    ADD CONSTRAINT "assembly_budgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assembly_categories"
    ADD CONSTRAINT "assembly_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assembly_record_correction_audit"
    ADD CONSTRAINT "assembly_record_correction_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assembly_settlements"
    ADD CONSTRAINT "assembly_settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assembly_standard_categories"
    ADD CONSTRAINT "assembly_standard_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assembly_standard_categories"
    ADD CONSTRAINT "assembly_standard_categories_type_name_key" UNIQUE ("type", "name");



ALTER TABLE ONLY "public"."assembly_year_closures"
    ADD CONSTRAINT "assembly_year_closures_neighborhood_id_fiscal_year_key" UNIQUE ("neighborhood_id", "fiscal_year");



ALTER TABLE ONLY "public"."assembly_year_closures"
    ADD CONSTRAINT "assembly_year_closures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assembly_year_lock_events"
    ADD CONSTRAINT "assembly_year_lock_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assembly_year_snapshots"
    ADD CONSTRAINT "assembly_year_snapshots_closure_id_revision_key" UNIQUE ("closure_id", "revision");



ALTER TABLE ONLY "public"."assembly_year_snapshots"
    ADD CONSTRAINT "assembly_year_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."circulars"
    ADD CONSTRAINT "circulars_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."era_mappings"
    ADD CONSTRAINT "era_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_applications"
    ADD CONSTRAINT "event_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."facility_reservations"
    ADD CONSTRAINT "facility_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_billings"
    ADD CONSTRAINT "fee_billings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_finalizations"
    ADD CONSTRAINT "fee_finalizations_neighborhood_id_fiscal_year_key" UNIQUE ("neighborhood_id", "fiscal_year");



ALTER TABLE ONLY "public"."fee_finalizations"
    ADD CONSTRAINT "fee_finalizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_record_correction_audit"
    ADD CONSTRAINT "fee_record_correction_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_records"
    ADD CONSTRAINT "fee_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_records"
    ADD CONSTRAINT "fee_records_roster_id_year_key" UNIQUE ("roster_id", "year");



ALTER TABLE ONLY "public"."fee_stripe_customers"
    ADD CONSTRAINT "fee_stripe_customers_pkey" PRIMARY KEY ("stripe_account_id", "roster_id");



ALTER TABLE ONLY "public"."fee_stripe_payments"
    ADD CONSTRAINT "fee_stripe_payments_pkey" PRIMARY KEY ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."fee_stripe_sessions"
    ADD CONSTRAINT "fee_stripe_sessions_pkey" PRIMARY KEY ("fee_record_id");



ALTER TABLE ONLY "public"."fee_stripe_sessions"
    ADD CONSTRAINT "fee_stripe_sessions_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."fee_year_closures"
    ADD CONSTRAINT "fee_year_closures_neighborhood_id_fiscal_year_key" UNIQUE ("neighborhood_id", "fiscal_year");



ALTER TABLE ONLY "public"."fee_year_closures"
    ADD CONSTRAINT "fee_year_closures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_year_lock_events"
    ADD CONSTRAINT "fee_year_lock_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_year_post_lock_payments"
    ADD CONSTRAINT "fee_year_post_lock_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fee_year_post_lock_payments"
    ADD CONSTRAINT "fee_year_post_lock_payments_stripe_checkout_session_id_key" UNIQUE ("stripe_checkout_session_id");



ALTER TABLE ONLY "public"."fee_year_post_lock_payments"
    ADD CONSTRAINT "fee_year_post_lock_payments_stripe_payment_intent_id_key" UNIQUE ("stripe_payment_intent_id");



ALTER TABLE ONLY "public"."fee_year_snapshot_rows"
    ADD CONSTRAINT "fee_year_snapshot_rows_closure_id_revision_fee_record_id_key" UNIQUE ("closure_id", "revision", "fee_record_id");



ALTER TABLE ONLY "public"."fee_year_snapshot_rows"
    ADD CONSTRAINT "fee_year_snapshot_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."line_push_logs"
    ADD CONSTRAINT "line_push_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_session_applications"
    ADD CONSTRAINT "live_session_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_sessions"
    ADD CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_fee_standard_applications"
    ADD CONSTRAINT "membership_fee_standard_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_fee_standard_versions"
    ADD CONSTRAINT "membership_fee_standard_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."membership_fee_standard_versions"
    ADD CONSTRAINT "membership_fee_standard_versions_version_number_key" UNIQUE ("version_number");



ALTER TABLE ONLY "public"."neighborhood_admins"
    ADD CONSTRAINT "neighborhood_admins_neighborhood_id_admin_email_key" UNIQUE ("neighborhood_id", "admin_email");



ALTER TABLE ONLY "public"."neighborhood_admins"
    ADD CONSTRAINT "neighborhood_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."neighborhood_commercial_disclosures"
    ADD CONSTRAINT "neighborhood_commercial_disclosures_pkey" PRIMARY KEY ("neighborhood_id");



ALTER TABLE "public"."neighborhood_fee_settings"
    ADD CONSTRAINT "neighborhood_fee_settings_bank_details_check" CHECK (((NOT "bank_transfer_enabled") OR ((NULLIF("btrim"("bank_name"), ''::"text") IS NOT NULL) AND (NULLIF("btrim"("bank_branch_name"), ''::"text") IS NOT NULL) AND ("bank_account_type" IS NOT NULL) AND (NULLIF("btrim"("bank_account_number"), ''::"text") IS NOT NULL) AND (NULLIF("btrim"("bank_account_holder"), ''::"text") IS NOT NULL)))) NOT VALID;



ALTER TABLE ONLY "public"."neighborhood_fee_settings"
    ADD CONSTRAINT "neighborhood_fee_settings_neighborhood_id_key" UNIQUE ("neighborhood_id");



ALTER TABLE ONLY "public"."neighborhood_fee_settings"
    ADD CONSTRAINT "neighborhood_fee_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."neighborhood_payment_change_requests"
    ADD CONSTRAINT "neighborhood_payment_change_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."neighborhoods"
    ADD CONSTRAINT "neighborhoods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_payments"
    ADD CONSTRAINT "platform_payments_neighborhood_id_year_month_key" UNIQUE ("neighborhood_id", "year_month");



ALTER TABLE ONLY "public"."platform_payments"
    ADD CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."public_posts"
    ADD CONSTRAINT "public_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."read_receipts"
    ADD CONSTRAINT "read_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservable_facilities"
    ADD CONSTRAINT "reservable_facilities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."resident_rosters"
    ADD CONSTRAINT "resident_rosters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_neighborhood_id_key" UNIQUE ("neighborhood_id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_usage_bank_account"
    ADD CONSTRAINT "system_usage_bank_account_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_usage_billings"
    ADD CONSTRAINT "system_usage_billings_neighborhood_id_billing_month_key" UNIQUE ("neighborhood_id", "billing_month");



ALTER TABLE ONLY "public"."system_usage_billings"
    ADD CONSTRAINT "system_usage_billings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_usage_payment_profiles"
    ADD CONSTRAINT "system_usage_payment_profiles_neighborhood_id_key" UNIQUE ("neighborhood_id");



ALTER TABLE ONLY "public"."system_usage_payment_profiles"
    ADD CONSTRAINT "system_usage_payment_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_usage_payment_profiles"
    ADD CONSTRAINT "system_usage_payment_profiles_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."system_usage_rate_versions"
    ADD CONSTRAINT "system_usage_rate_versions_effective_month_key" UNIQUE ("effective_month");



ALTER TABLE ONLY "public"."system_usage_rate_versions"
    ADD CONSTRAINT "system_usage_rate_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."neighborhoods"
    ADD CONSTRAINT "unique_neighborhood_per_area" UNIQUE ("postal_code", "name");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "assembly_budgets_neighborhood_year_category_unique" ON "public"."assembly_budgets" USING "btree" ("neighborhood_id", "fiscal_year", "category_id");



CREATE INDEX "assembly_categories_neighborhood_idx" ON "public"."assembly_categories" USING "btree" ("neighborhood_id", "type", "sort_order");



CREATE INDEX "assembly_record_correction_lookup" ON "public"."assembly_record_correction_audit" USING "btree" ("neighborhood_id", "fiscal_year", "created_at" DESC);



CREATE UNIQUE INDEX "assembly_settlements_external_source_unique" ON "public"."assembly_settlements" USING "btree" ("neighborhood_id", "source_type", "source_id") WHERE (("source_type" IS NOT NULL) AND ("source_id" IS NOT NULL));



CREATE INDEX "assembly_settlements_neighborhood_year_idx" ON "public"."assembly_settlements" USING "btree" ("neighborhood_id", "fiscal_year", "paid_date");



CREATE INDEX "assembly_year_lock_events_lookup" ON "public"."assembly_year_lock_events" USING "btree" ("neighborhood_id", "fiscal_year", "created_at" DESC);



CREATE INDEX "assembly_year_snapshots_lookup" ON "public"."assembly_year_snapshots" USING "btree" ("neighborhood_id", "fiscal_year", "revision" DESC);



CREATE UNIQUE INDEX "event_applications_one_assembly_reply_per_roster" ON "public"."event_applications" USING "btree" ("circular_id", "roster_id") WHERE (("circular_id" IS NOT NULL) AND ("roster_id" IS NOT NULL) AND ("reply_status" = ANY (ARRAY['present'::"text", 'absent'::"text"])));



CREATE UNIQUE INDEX "event_applications_one_assembly_reply_per_user" ON "public"."event_applications" USING "btree" ("circular_id", "user_auth_id") WHERE (("circular_id" IS NOT NULL) AND ("roster_id" IS NULL) AND ("user_auth_id" IS NOT NULL) AND ("reply_status" = ANY (ARRAY['present'::"text", 'absent'::"text"])));



CREATE UNIQUE INDEX "event_applications_one_attendance_per_roster" ON "public"."event_applications" USING "btree" ("circular_id", "roster_id") WHERE (("circular_id" IS NOT NULL) AND ("roster_id" IS NOT NULL) AND ("reply_status" = 'attend'::"text"));



CREATE UNIQUE INDEX "event_applications_one_attendance_per_user" ON "public"."event_applications" USING "btree" ("circular_id", "user_auth_id") WHERE (("circular_id" IS NOT NULL) AND ("roster_id" IS NULL) AND ("user_auth_id" IS NOT NULL) AND ("reply_status" = 'attend'::"text"));



CREATE INDEX "fee_record_correction_audit_lookup" ON "public"."fee_record_correction_audit" USING "btree" ("neighborhood_id", "fiscal_year", "fee_record_id", "created_at" DESC);



CREATE UNIQUE INDEX "fee_records_roster_year_unique" ON "public"."fee_records" USING "btree" ("neighborhood_id", "roster_id_snapshot", "fiscal_year") WHERE ("roster_id_snapshot" IS NOT NULL);



CREATE INDEX "fee_year_snapshot_lookup" ON "public"."fee_year_snapshot_rows" USING "btree" ("neighborhood_id", "fiscal_year", "revision");



CREATE INDEX "idx_facilities_neighborhood" ON "public"."facilities" USING "btree" ("neighborhood_id", "is_active");



CREATE INDEX "idx_facility_reservations_bigint_facility_date_status" ON "public"."facility_reservations" USING "btree" ("facility_bigint_id", "reservation_date", "status");



CREATE INDEX "idx_facility_reservations_facility_date_status" ON "public"."facility_reservations" USING "btree" ("facility_id", "reservation_date", "status");



CREATE INDEX "idx_live_session_applications_resident_roster" ON "public"."live_session_applications" USING "btree" ("resident_roster_id", "applied_at");



CREATE INDEX "idx_live_session_applications_session" ON "public"."live_session_applications" USING "btree" ("live_session_id", "applied_at");



CREATE UNIQUE INDEX "idx_live_session_applications_unique_resident" ON "public"."live_session_applications" USING "btree" ("live_session_id", "resident_roster_id") WHERE (("live_session_id" IS NOT NULL) AND ("resident_roster_id" IS NOT NULL));



CREATE INDEX "idx_live_sessions_neighborhood_date" ON "public"."live_sessions" USING "btree" ("neighborhood_id", "event_date");



CREATE INDEX "membership_fee_standard_applications_lookup_idx" ON "public"."membership_fee_standard_applications" USING "btree" ("neighborhood_id", "applied_at" DESC);



CREATE UNIQUE INDEX "membership_fee_standard_one_published_idx" ON "public"."membership_fee_standard_versions" USING "btree" ("status") WHERE ("status" = 'published'::"text");



CREATE UNIQUE INDEX "neighborhood_admins_active_email_per_town_key" ON "public"."neighborhood_admins" USING "btree" ("neighborhood_id", "lower"("admin_email")) WHERE ("status" <> ALL (ARRAY['retired'::"text", 'rejected'::"text"]));



CREATE UNIQUE INDEX "neighborhood_admins_invite_token_key" ON "public"."neighborhood_admins" USING "btree" ("admin_invite_token") WHERE ("admin_invite_token" IS NOT NULL);



CREATE INDEX "neighborhood_fee_settings_standard_version_idx" ON "public"."neighborhood_fee_settings" USING "btree" ("standard_version_id");



CREATE UNIQUE INDEX "neighborhood_payment_change_requests_one_pending" ON "public"."neighborhood_payment_change_requests" USING "btree" ("neighborhood_id") WHERE ("status" = 'pending'::"text");



CREATE INDEX "neighborhood_payment_change_requests_status_created" ON "public"."neighborhood_payment_change_requests" USING "btree" ("status", "created_at" DESC);



CREATE UNIQUE INDEX "resident_rosters_family_invite_token_1_key" ON "public"."resident_rosters" USING "btree" ("family_invite_token_1") WHERE ("family_invite_token_1" IS NOT NULL);



CREATE UNIQUE INDEX "resident_rosters_family_invite_token_2_key" ON "public"."resident_rosters" USING "btree" ("family_invite_token_2") WHERE ("family_invite_token_2" IS NOT NULL);



CREATE INDEX "resident_rosters_family_line_user_id_1_idx" ON "public"."resident_rosters" USING "btree" ("family_line_user_id_1");



CREATE INDEX "resident_rosters_family_line_user_id_2_idx" ON "public"."resident_rosters" USING "btree" ("family_line_user_id_2");



CREATE INDEX "resident_rosters_line_user_id_idx" ON "public"."resident_rosters" USING "btree" ("line_user_id");



CREATE UNIQUE INDEX "system_usage_billings_stripe_checkout_session_idx" ON "public"."system_usage_billings" USING "btree" ("stripe_checkout_session_id") WHERE ("stripe_checkout_session_id" IS NOT NULL);



CREATE UNIQUE INDEX "system_usage_billings_stripe_invoice_idx" ON "public"."system_usage_billings" USING "btree" ("stripe_invoice_id") WHERE ("stripe_invoice_id" IS NOT NULL);



CREATE UNIQUE INDEX "system_usage_payment_profiles_customer_idx" ON "public"."system_usage_payment_profiles" USING "btree" ("stripe_customer_id") WHERE ("stripe_customer_id" IS NOT NULL);



CREATE UNIQUE INDEX "system_usage_payment_profiles_neighborhood_idx" ON "public"."system_usage_payment_profiles" USING "btree" ("neighborhood_id");



CREATE OR REPLACE TRIGGER "assembly_budgets_audit_unlocked" AFTER INSERT OR DELETE OR UPDATE ON "public"."assembly_budgets" FOR EACH ROW EXECUTE FUNCTION "public"."audit_unlocked_assembly_correction"();



CREATE OR REPLACE TRIGGER "assembly_budgets_guard_finalized" BEFORE INSERT OR DELETE OR UPDATE ON "public"."assembly_budgets" FOR EACH ROW EXECUTE FUNCTION "public"."guard_finalized_assembly_record"();



CREATE OR REPLACE TRIGGER "assembly_settlements_audit_unlocked" AFTER INSERT OR DELETE OR UPDATE ON "public"."assembly_settlements" FOR EACH ROW EXECUTE FUNCTION "public"."audit_unlocked_assembly_correction"();



CREATE OR REPLACE TRIGGER "assembly_settlements_guard_finalized" BEFORE INSERT OR DELETE OR UPDATE ON "public"."assembly_settlements" FOR EACH ROW EXECUTE FUNCTION "public"."guard_finalized_assembly_record"();



CREATE OR REPLACE TRIGGER "facility_reservations_prevent_overlap" BEFORE INSERT OR UPDATE OF "facility_bigint_id", "reservation_date", "start_time", "end_time", "status" ON "public"."facility_reservations" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_facility_reservation_overlap"();



CREATE OR REPLACE TRIGGER "fee_records_audit_correction" AFTER INSERT OR DELETE OR UPDATE ON "public"."fee_records" FOR EACH ROW EXECUTE FUNCTION "public"."audit_fee_record_correction"();



CREATE OR REPLACE TRIGGER "fee_records_set_identity" BEFORE INSERT OR UPDATE OF "roster_id" ON "public"."fee_records" FOR EACH ROW EXECUTE FUNCTION "public"."set_fee_record_identity"();



CREATE OR REPLACE TRIGGER "fee_records_z_guard_finalized" BEFORE INSERT OR DELETE OR UPDATE ON "public"."fee_records" FOR EACH ROW EXECUTE FUNCTION "public"."guard_finalized_fee_record"();



CREATE OR REPLACE TRIGGER "membership_fee_standard_versions_updated_at" BEFORE UPDATE ON "public"."membership_fee_standard_versions" FOR EACH ROW EXECUTE FUNCTION "public"."set_membership_fee_updated_at"();



CREATE OR REPLACE TRIGGER "neighborhood_fee_settings_updated_at" BEFORE UPDATE ON "public"."neighborhood_fee_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_membership_fee_updated_at"();



CREATE OR REPLACE TRIGGER "neighborhoods_add_system_admin" AFTER INSERT ON "public"."neighborhoods" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_system_admin_for_neighborhood"();



CREATE OR REPLACE TRIGGER "neighborhoods_copy_membership_fee_standard" AFTER INSERT ON "public"."neighborhoods" FOR EACH ROW EXECUTE FUNCTION "public"."copy_published_membership_fee_standard"();



CREATE OR REPLACE TRIGGER "neighborhoods_initialize_assembly_categories" AFTER INSERT ON "public"."neighborhoods" FOR EACH ROW EXECUTE FUNCTION "public"."initialize_neighborhood_assembly_categories"();



CREATE OR REPLACE TRIGGER "on_resident_deleted" BEFORE DELETE ON "public"."resident_rosters" FOR EACH ROW EXECUTE FUNCTION "public"."handle_delete_auth_user"();



CREATE OR REPLACE TRIGGER "resident_roster_withdrawal_guard" BEFORE UPDATE OF "withdrawal_status" ON "public"."resident_rosters" FOR EACH ROW EXECUTE FUNCTION "public"."guard_resident_roster_withdrawal"();



ALTER TABLE ONLY "public"."assembly_budgets"
    ADD CONSTRAINT "assembly_budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."assembly_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assembly_budgets"
    ADD CONSTRAINT "assembly_budgets_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assembly_categories"
    ADD CONSTRAINT "assembly_categories_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assembly_categories"
    ADD CONSTRAINT "assembly_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."assembly_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assembly_record_correction_audit"
    ADD CONSTRAINT "assembly_record_correction_audit_closure_id_fkey" FOREIGN KEY ("closure_id") REFERENCES "public"."assembly_year_closures"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assembly_record_correction_audit"
    ADD CONSTRAINT "assembly_record_correction_audit_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assembly_settlements"
    ADD CONSTRAINT "assembly_settlements_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."assembly_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."assembly_settlements"
    ADD CONSTRAINT "assembly_settlements_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."assembly_year_closures"
    ADD CONSTRAINT "assembly_year_closures_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assembly_year_lock_events"
    ADD CONSTRAINT "assembly_year_lock_events_closure_id_fkey" FOREIGN KEY ("closure_id") REFERENCES "public"."assembly_year_closures"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assembly_year_lock_events"
    ADD CONSTRAINT "assembly_year_lock_events_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assembly_year_snapshots"
    ADD CONSTRAINT "assembly_year_snapshots_closure_id_fkey" FOREIGN KEY ("closure_id") REFERENCES "public"."assembly_year_closures"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."assembly_year_snapshots"
    ADD CONSTRAINT "assembly_year_snapshots_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."circulars"
    ADD CONSTRAINT "circulars_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."reservable_facilities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."circulars"
    ADD CONSTRAINT "circulars_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id");



ALTER TABLE ONLY "public"."circulars"
    ADD CONSTRAINT "circulars_parent_circular_id_fkey" FOREIGN KEY ("parent_circular_id") REFERENCES "public"."circulars"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_applications"
    ADD CONSTRAINT "event_applications_circular_id_fkey" FOREIGN KEY ("circular_id") REFERENCES "public"."circulars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_applications"
    ADD CONSTRAINT "event_applications_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facilities"
    ADD CONSTRAINT "facilities_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_reservations"
    ADD CONSTRAINT "facility_reservations_circular_id_fkey" FOREIGN KEY ("circular_id") REFERENCES "public"."circulars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_reservations"
    ADD CONSTRAINT "facility_reservations_facility_bigint_id_fkey" FOREIGN KEY ("facility_bigint_id") REFERENCES "public"."facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_reservations"
    ADD CONSTRAINT "facility_reservations_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "public"."reservable_facilities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_reservations"
    ADD CONSTRAINT "facility_reservations_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."facility_reservations"
    ADD CONSTRAINT "facility_reservations_resident_roster_id_fkey" FOREIGN KEY ("resident_roster_id") REFERENCES "public"."resident_rosters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fee_billings"
    ADD CONSTRAINT "fee_billings_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_billings"
    ADD CONSTRAINT "fee_billings_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "public"."resident_rosters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fee_finalizations"
    ADD CONSTRAINT "fee_finalizations_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fee_record_correction_audit"
    ADD CONSTRAINT "fee_record_correction_audit_closure_id_fkey" FOREIGN KEY ("closure_id") REFERENCES "public"."fee_year_closures"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fee_records"
    ADD CONSTRAINT "fee_records_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fee_records"
    ADD CONSTRAINT "fee_records_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "public"."resident_rosters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."fee_year_closures"
    ADD CONSTRAINT "fee_year_closures_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fee_year_lock_events"
    ADD CONSTRAINT "fee_year_lock_events_closure_id_fkey" FOREIGN KEY ("closure_id") REFERENCES "public"."fee_year_closures"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fee_year_post_lock_payments"
    ADD CONSTRAINT "fee_year_post_lock_payments_closure_id_fkey" FOREIGN KEY ("closure_id") REFERENCES "public"."fee_year_closures"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."fee_year_snapshot_rows"
    ADD CONSTRAINT "fee_year_snapshot_rows_closure_id_fkey" FOREIGN KEY ("closure_id") REFERENCES "public"."fee_year_closures"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."line_push_logs"
    ADD CONSTRAINT "line_push_logs_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_session_applications"
    ADD CONSTRAINT "live_session_applications_live_session_id_fkey" FOREIGN KEY ("live_session_id") REFERENCES "public"."live_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_session_applications"
    ADD CONSTRAINT "live_session_applications_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_session_applications"
    ADD CONSTRAINT "live_session_applications_resident_roster_id_fkey" FOREIGN KEY ("resident_roster_id") REFERENCES "public"."resident_rosters"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."live_sessions"
    ADD CONSTRAINT "live_sessions_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membership_fee_standard_applications"
    ADD CONSTRAINT "membership_fee_standard_applications_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."membership_fee_standard_applications"
    ADD CONSTRAINT "membership_fee_standard_applications_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."membership_fee_standard_applications"
    ADD CONSTRAINT "membership_fee_standard_applications_standard_version_id_fkey" FOREIGN KEY ("standard_version_id") REFERENCES "public"."membership_fee_standard_versions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."membership_fee_standard_versions"
    ADD CONSTRAINT "membership_fee_standard_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."neighborhood_admins"
    ADD CONSTRAINT "neighborhood_admins_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."neighborhood_commercial_disclosures"
    ADD CONSTRAINT "neighborhood_commercial_disclosures_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."neighborhood_fee_settings"
    ADD CONSTRAINT "neighborhood_fee_settings_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."neighborhood_fee_settings"
    ADD CONSTRAINT "neighborhood_fee_settings_standard_version_id_fkey" FOREIGN KEY ("standard_version_id") REFERENCES "public"."membership_fee_standard_versions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."neighborhood_payment_change_requests"
    ADD CONSTRAINT "neighborhood_payment_change_requests_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_payments"
    ADD CONSTRAINT "platform_payments_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."public_posts"
    ADD CONSTRAINT "public_posts_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."read_receipts"
    ADD CONSTRAINT "read_receipts_circular_id_fkey" FOREIGN KEY ("circular_id") REFERENCES "public"."circulars"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reservable_facilities"
    ADD CONSTRAINT "reservable_facilities_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."resident_rosters"
    ADD CONSTRAINT "resident_rosters_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_usage_billings"
    ADD CONSTRAINT "system_usage_billings_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_usage_billings"
    ADD CONSTRAINT "system_usage_billings_rate_version_id_fkey" FOREIGN KEY ("rate_version_id") REFERENCES "public"."system_usage_rate_versions"("id");



ALTER TABLE ONLY "public"."system_usage_payment_profiles"
    ADD CONSTRAINT "system_usage_payment_profiles_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "public"."neighborhoods"("id") ON DELETE CASCADE;















































































































































































































ALTER TABLE "public"."assembly_budgets" ENABLE ROW LEVEL SECURITY;














ALTER TABLE "public"."assembly_categories" ENABLE ROW LEVEL SECURITY;

















ALTER TABLE "public"."assembly_record_correction_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."assembly_settlements" ENABLE ROW LEVEL SECURITY;














ALTER TABLE "public"."assembly_standard_categories" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."assembly_year_closures" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."assembly_year_lock_events" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."assembly_year_snapshots" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."circulars" ENABLE ROW LEVEL SECURITY;












































ALTER TABLE "public"."era_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_applications" ENABLE ROW LEVEL SECURITY;








ALTER TABLE "public"."facilities" ENABLE ROW LEVEL SECURITY;

















ALTER TABLE "public"."facility_reservations" ENABLE ROW LEVEL SECURITY;














ALTER TABLE "public"."fee_billings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_finalizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_record_correction_audit" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."fee_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_stripe_customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_stripe_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_stripe_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fee_year_closures" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."fee_year_lock_events" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."fee_year_post_lock_payments" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."fee_year_snapshot_rows" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."line_push_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_session_applications" ENABLE ROW LEVEL SECURITY;








ALTER TABLE "public"."live_sessions" ENABLE ROW LEVEL SECURITY;











ALTER TABLE "public"."membership_fee_standard_applications" ENABLE ROW LEVEL SECURITY;








ALTER TABLE "public"."membership_fee_standard_versions" ENABLE ROW LEVEL SECURITY;














ALTER TABLE "public"."neighborhood_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."neighborhood_commercial_disclosures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."neighborhood_fee_settings" ENABLE ROW LEVEL SECURITY;








ALTER TABLE "public"."neighborhood_payment_change_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."neighborhoods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."public_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."read_receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservable_facilities" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."resident_rosters" ENABLE ROW LEVEL SECURITY;











ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_usage_bank_account" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_usage_billings" ENABLE ROW LEVEL SECURITY;








ALTER TABLE "public"."system_usage_payment_profiles" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."system_usage_rate_versions" ENABLE ROW LEVEL SECURITY;





ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- Supabase projects may start with default privileges. Remove them explicitly.
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- Service-role access is reserved for server-side code; never expose its key to a browser.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

COMMIT;
