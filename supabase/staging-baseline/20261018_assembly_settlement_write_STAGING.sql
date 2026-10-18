-- Staging only. Verify Supabase project el-town-staging and Project ID
-- zghcorbdtslrjtkkspfe in the dashboard before running this SQL.
-- SQL alone cannot identify the Supabase project.
BEGIN;

DO $staging_settlement_guard$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')) <> 45
     OR pg_catalog.to_regclass('el_town_staging_private.system_admin_identity') IS NULL
     OR (SELECT count(*) FROM el_town_staging_private.system_admin_identity) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM el_town_staging_private.system_admin_identity
       WHERE auth_user_id = '575133be-3165-4a3c-b008-21c6804f5447'::uuid
     )
     OR pg_catalog.to_regprocedure('public.create_assembly_settlement(bigint,integer,bigint,integer,date,text)') IS NOT NULL
     OR pg_catalog.to_regprocedure('public.delete_assembly_settlement(bigint,integer,bigint)') IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected staging state; settlement functions were not created';
  END IF;
END;
$staging_settlement_guard$;

CREATE FUNCTION public.create_assembly_settlement(
  p_neighborhood_id bigint,
  p_fiscal_year integer,
  p_category_id bigint,
  p_amount integer,
  p_paid_date date,
  p_description text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $create_assembly_settlement$
DECLARE
  v_actor uuid := auth.uid();
  v_status text;
  v_category public.assembly_categories%ROWTYPE;
  v_id bigint;
BEGIN
  IF v_actor IS NULL OR p_neighborhood_id IS NULL OR p_neighborhood_id <= 0
     OR p_fiscal_year IS NULL OR p_fiscal_year NOT BETWEEN 2000 AND 2200
     OR p_category_id IS NULL OR p_category_id <= 0
     OR p_amount IS NULL OR p_amount <= 0
     OR p_paid_date IS NULL OR length(coalesce(p_description, '')) > 500 THEN
    RAISE EXCEPTION 'Invalid settlement input';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.neighborhood_admins
    WHERE neighborhood_id = p_neighborhood_id AND admin_auth_id = v_actor AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active town membership required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('assembly-year:' || p_neighborhood_id || ':' || p_fiscal_year, 0)
  );
  SELECT status INTO v_status FROM public.assembly_year_closures
    WHERE neighborhood_id = p_neighborhood_id AND fiscal_year = p_fiscal_year FOR UPDATE;
  IF v_status = 'locked' THEN RAISE EXCEPTION 'Assembly year is locked'; END IF;
  IF v_status = 'unlocked' AND NOT public.assembly_actor_is_representative(p_neighborhood_id) THEN
    RAISE EXCEPTION 'Representative required during correction';
  END IF;

  SELECT * INTO v_category FROM public.assembly_categories
    WHERE id = p_category_id AND neighborhood_id = p_neighborhood_id;
  IF NOT FOUND OR v_category.is_active IS FALSE THEN RAISE EXCEPTION 'Category unavailable'; END IF;
  IF v_category.type = 'income' AND v_category.parent_id IS NULL
     AND btrim(v_category.name) = '会費' THEN
    RAISE EXCEPTION 'Membership fees are calculated automatically';
  END IF;

  INSERT INTO public.assembly_settlements (
    neighborhood_id, fiscal_year, category_id, type, amount, paid_date, description
  ) VALUES (
    p_neighborhood_id, p_fiscal_year, p_category_id, v_category.type, p_amount,
    p_paid_date, nullif(btrim(p_description), '')
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$create_assembly_settlement$;

CREATE FUNCTION public.delete_assembly_settlement(
  p_neighborhood_id bigint,
  p_fiscal_year integer,
  p_settlement_id bigint
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $delete_assembly_settlement$
DECLARE
  v_actor uuid := auth.uid();
  v_status text;
  v_row public.assembly_settlements%ROWTYPE;
BEGIN
  IF v_actor IS NULL OR p_neighborhood_id IS NULL OR p_neighborhood_id <= 0
     OR p_fiscal_year IS NULL OR p_fiscal_year NOT BETWEEN 2000 AND 2200
     OR p_settlement_id IS NULL OR p_settlement_id <= 0 THEN
    RAISE EXCEPTION 'Invalid settlement input';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.neighborhood_admins
    WHERE neighborhood_id = p_neighborhood_id AND admin_auth_id = v_actor AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Active town membership required';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('assembly-year:' || p_neighborhood_id || ':' || p_fiscal_year, 0)
  );
  SELECT status INTO v_status FROM public.assembly_year_closures
    WHERE neighborhood_id = p_neighborhood_id AND fiscal_year = p_fiscal_year FOR UPDATE;
  IF v_status = 'locked' THEN RAISE EXCEPTION 'Assembly year is locked'; END IF;
  IF v_status = 'unlocked' AND NOT public.assembly_actor_is_representative(p_neighborhood_id) THEN
    RAISE EXCEPTION 'Representative required during correction';
  END IF;

  SELECT * INTO v_row FROM public.assembly_settlements
    WHERE id = p_settlement_id AND neighborhood_id = p_neighborhood_id
      AND fiscal_year = p_fiscal_year FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_row.source_type IS NOT NULL OR v_row.source_id IS NOT NULL THEN
    RAISE EXCEPTION 'Automatically generated settlement cannot be deleted here';
  END IF;
  DELETE FROM public.assembly_settlements WHERE id = v_row.id;
  RETURN true;
END;
$delete_assembly_settlement$;

REVOKE ALL ON FUNCTION public.create_assembly_settlement(bigint,integer,bigint,integer,date,text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_assembly_settlement(bigint,integer,bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_assembly_settlement(bigint,integer,bigint,integer,date,text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_assembly_settlement(bigint,integer,bigint)
  TO authenticated;

COMMIT;

SELECT p.proname AS function_name,
       pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_assembly_settlement', 'delete_assembly_settlement')
ORDER BY p.proname;
