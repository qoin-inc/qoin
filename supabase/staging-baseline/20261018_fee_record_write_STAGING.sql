-- Staging only. Confirm dashboard project el-town-staging, ID zghcorbdtslrjtkkspfe.
-- This SQL cannot independently identify the Supabase project.
BEGIN;

DO $guard$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) <> 45
     OR pg_catalog.to_regclass('el_town_staging_private.system_admin_identity') IS NULL
     OR (SELECT count(*) FROM el_town_staging_private.system_admin_identity) <> 1
     OR NOT EXISTS (SELECT 1 FROM el_town_staging_private.system_admin_identity
                    WHERE auth_user_id = '575133be-3165-4a3c-b008-21c6804f5447'::uuid)
     OR pg_catalog.to_regprocedure('public.write_fee_records(bigint,integer,text,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected staging state; fee write function was not created';
  END IF;
END;
$guard$;

CREATE FUNCTION public.write_fee_records(
  p_neighborhood_id bigint, p_fiscal_year integer, p_mode text, p_rows jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $write_fee_records$
DECLARE
  v_actor uuid := auth.uid();
  v_status text;
  v_item jsonb;
  v_roster_id uuid;
  v_seen uuid[] := '{}';
  v_billing integer;
  v_cash integer;
  v_stripe integer;
  v_paid integer;
  v_existing public.fee_records%ROWTYPE;
  v_saved public.fee_records%ROWTYPE;
  v_result jsonb := '[]'::jsonb;
BEGIN
  IF v_actor IS NULL OR p_neighborhood_id IS NULL OR p_neighborhood_id <= 0
     OR p_fiscal_year IS NULL OR p_fiscal_year NOT BETWEEN 2000 AND 2200
     OR p_mode IS NULL OR p_mode NOT IN ('billing', 'cash')
     OR p_rows IS NULL OR pg_catalog.jsonb_typeof(p_rows) <> 'array'
     OR pg_catalog.jsonb_array_length(p_rows) NOT BETWEEN 1 AND 5000
     OR (p_mode = 'cash' AND pg_catalog.jsonb_array_length(p_rows) <> 1) THEN
    RAISE EXCEPTION 'Invalid fee request';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.neighborhood_admins
      WHERE neighborhood_id = p_neighborhood_id AND admin_auth_id = v_actor AND status = 'active') THEN
    RAISE EXCEPTION 'Active town membership required';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('fee-year:' || p_neighborhood_id || ':' || p_fiscal_year, 0));
  SELECT status INTO v_status FROM public.fee_year_closures
    WHERE neighborhood_id = p_neighborhood_id AND fiscal_year = p_fiscal_year FOR UPDATE;
  IF v_status = 'locked' THEN RAISE EXCEPTION 'Fee year is locked'; END IF;
  IF v_status = 'unlocked' AND (
      p_mode = 'billing' OR NOT public.fee_actor_is_representative(p_neighborhood_id)) THEN
    RAISE EXCEPTION 'Only a representative may correct individual fees';
  END IF;

  FOR v_item IN SELECT item.value FROM pg_catalog.jsonb_array_elements(p_rows) AS item(value) LOOP
    IF pg_catalog.jsonb_typeof(v_item) <> 'object'
       OR v_item->>'rosterId' IS NULL
       OR (v_item->>'rosterId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR v_item->>'billingAmount' IS NULL
       OR (v_item->>'billingAmount') !~ '^(0|[1-9][0-9]{0,9})$'
       OR (p_mode = 'cash' AND (v_item->>'cashAmount' IS NULL
           OR (v_item->>'cashAmount') !~ '^(0|[1-9][0-9]{0,9})$')) THEN
      RAISE EXCEPTION 'Invalid fee row';
    END IF;
    IF (v_item->>'billingAmount')::bigint > 2147483647
       OR (p_mode = 'cash' AND (v_item->>'cashAmount')::bigint > 2147483647) THEN
      RAISE EXCEPTION 'Fee amount out of range';
    END IF;
    v_roster_id := (v_item->>'rosterId')::uuid;
    IF v_roster_id = ANY(v_seen) THEN RAISE EXCEPTION 'Duplicate roster'; END IF;
    v_seen := pg_catalog.array_append(v_seen, v_roster_id);
    v_billing := (v_item->>'billingAmount')::integer;
    IF NOT EXISTS (SELECT 1 FROM public.resident_rosters
        WHERE id = v_roster_id AND neighborhood_id = p_neighborhood_id) THEN
      RAISE EXCEPTION 'Roster is outside this town';
    END IF;
    SELECT * INTO v_existing FROM public.fee_records
      WHERE roster_id = v_roster_id AND year = p_fiscal_year FOR UPDATE;
    v_cash := CASE WHEN p_mode = 'cash' THEN (v_item->>'cashAmount')::integer
                   ELSE COALESCE(v_existing.paid_amount_cash, 0) END;
    v_stripe := COALESCE(v_existing.paid_amount_stripe, 0);
    IF v_cash::bigint + v_stripe::bigint > 2147483647 THEN
      RAISE EXCEPTION 'Total payment out of range';
    END IF;
    v_paid := v_cash + v_stripe;

    IF v_existing.id IS NULL THEN
      INSERT INTO public.fee_records (
        roster_id, neighborhood_id, resident_name, year, fiscal_year,
        expected_amount, billing_amount, amount, paid_amount_cash,
        paid_amount_stripe, paid_amount, unpaid_amount, billing_channel,
        billing_status, status, is_billed, billed_at, payment_method,
        last_payment_method, paid_at
      ) VALUES (
        v_roster_id, p_neighborhood_id, 'pending identity trigger', p_fiscal_year, p_fiscal_year,
        v_billing, v_billing, v_billing, v_cash, 0, v_paid,
        GREATEST(v_billing - v_paid, 0), 'manual', 'billed',
        CASE WHEN v_paid = 0 THEN 'unpaid' WHEN v_paid >= v_billing THEN 'paid' ELSE 'partial' END,
        true, now(), CASE WHEN v_cash > 0 THEN 'cash' ELSE NULL END,
        CASE WHEN v_cash > 0 THEN 'cash' ELSE NULL END,
        CASE WHEN v_paid > 0 THEN now() ELSE NULL END
      ) RETURNING * INTO v_saved;
    ELSE
      UPDATE public.fee_records SET
        expected_amount = v_billing, billing_amount = v_billing, amount = v_billing,
        paid_amount_cash = v_cash, paid_amount = v_paid,
        unpaid_amount = GREATEST(v_billing - v_paid, 0),
        payment_method = CASE WHEN v_cash > 0 AND v_stripe > 0 THEN 'mixed'
                              WHEN v_stripe > 0 THEN 'stripe'
                              WHEN v_cash > 0 THEN 'cash' ELSE NULL END,
        last_payment_method = CASE WHEN p_mode = 'cash' AND v_cash > 0 THEN 'cash'
                                   ELSE v_existing.last_payment_method END,
        status = CASE WHEN v_paid = 0 THEN 'unpaid'
                      WHEN v_paid >= v_billing THEN 'paid' ELSE 'partial' END,
        is_billed = true, billing_status = 'billed',
        billed_at = COALESCE(v_existing.billed_at, now()),
        paid_at = CASE WHEN v_paid > 0 THEN COALESCE(v_existing.paid_at, now()) ELSE NULL END,
        updated_at = now()
      WHERE id = v_existing.id RETURNING * INTO v_saved;
    END IF;
    v_result := v_result || pg_catalog.jsonb_build_array(pg_catalog.to_jsonb(v_saved));
  END LOOP;
  RETURN v_result;
END;
$write_fee_records$;

REVOKE ALL ON FUNCTION public.write_fee_records(bigint,integer,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_fee_records(bigint,integer,text,jsonb) TO authenticated;
COMMIT;

SELECT pg_catalog.has_function_privilege('anon',
         'public.write_fee_records(bigint,integer,text,jsonb)', 'EXECUTE') AS anon_execute,
       pg_catalog.has_function_privilege('authenticated',
         'public.write_fee_records(bigint,integer,text,jsonb)', 'EXECUTE') AS authenticated_execute;
