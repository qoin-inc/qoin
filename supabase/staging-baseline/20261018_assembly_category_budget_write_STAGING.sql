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
     OR pg_catalog.to_regprocedure('public.manage_assembly_category(bigint,integer,text,bigint,text,text,bigint,integer)') IS NOT NULL
     OR pg_catalog.to_regprocedure('public.save_assembly_budgets(bigint,integer,jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected staging state; category and budget functions were not created';
  END IF;
END;
$guard$;

CREATE FUNCTION public.manage_assembly_category(
  p_neighborhood_id bigint, p_fiscal_year integer, p_action text,
  p_category_id bigint, p_type text, p_name text, p_parent_id bigint, p_sort_order integer
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $manage_category$
DECLARE
  v_actor uuid := auth.uid();
  v_status text;
  v_existing public.assembly_categories%ROWTYPE;
  v_parent public.assembly_categories%ROWTYPE;
  v_id bigint;
BEGIN
  IF v_actor IS NULL OR p_neighborhood_id IS NULL OR p_neighborhood_id <= 0
     OR p_fiscal_year IS NULL OR p_fiscal_year NOT BETWEEN 2000 AND 2200
     OR p_action IS NULL OR p_action NOT IN ('create', 'update', 'delete') THEN
    RAISE EXCEPTION 'Invalid category request';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.neighborhood_admins
      WHERE neighborhood_id = p_neighborhood_id AND admin_auth_id = v_actor AND status = 'active') THEN
    RAISE EXCEPTION 'Active town membership required';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('assembly-year:' || p_neighborhood_id || ':' || p_fiscal_year, 0));
  SELECT status INTO v_status FROM public.assembly_year_closures
    WHERE neighborhood_id = p_neighborhood_id AND fiscal_year = p_fiscal_year FOR UPDATE;
  IF v_status = 'locked' THEN RAISE EXCEPTION 'Assembly year is locked'; END IF;
  IF v_status = 'unlocked' AND NOT public.assembly_actor_is_representative(p_neighborhood_id) THEN
    RAISE EXCEPTION 'Representative required during correction';
  END IF;
  IF v_status = 'unlocked' THEN
    RAISE EXCEPTION 'Category changes are not audited during correction';
  END IF;

  IF p_action IN ('update', 'delete') THEN
    IF p_category_id IS NULL OR p_category_id <= 0 THEN RAISE EXCEPTION 'Category ID required'; END IF;
    SELECT * INTO v_existing FROM public.assembly_categories
      WHERE id = p_category_id AND neighborhood_id = p_neighborhood_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Category unavailable'; END IF;
    -- Categories are shared across fiscal years; cascading deletion/renaming can alter old reports.
    IF EXISTS (SELECT 1 FROM public.assembly_year_closures
        WHERE neighborhood_id = p_neighborhood_id) THEN
      RAISE EXCEPTION 'Category changes are blocked after any fiscal-year closure';
    END IF;
  END IF;

  IF p_action = 'delete' THEN
    DELETE FROM public.assembly_categories WHERE id = v_existing.id;
    RETURN v_existing.id;
  END IF;

  IF p_type NOT IN ('income', 'expense') OR p_type IS NULL
     OR p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 100
     OR p_sort_order IS NULL OR p_sort_order NOT BETWEEN -100000 AND 100000 THEN
    RAISE EXCEPTION 'Invalid category fields';
  END IF;
  IF p_parent_id IS NOT NULL THEN
    SELECT * INTO v_parent FROM public.assembly_categories
      WHERE id = p_parent_id AND neighborhood_id = p_neighborhood_id FOR UPDATE;
    IF NOT FOUND OR v_parent.parent_id IS NOT NULL OR v_parent.type <> p_type
       OR v_parent.is_active IS DISTINCT FROM true OR p_parent_id = p_category_id THEN
      RAISE EXCEPTION 'Invalid parent category';
    END IF;
  END IF;
  IF p_action = 'create' THEN
    INSERT INTO public.assembly_categories
      (neighborhood_id, type, name, parent_id, sort_order, is_active, is_standard)
    VALUES (p_neighborhood_id, p_type, btrim(p_name), p_parent_id, p_sort_order, true, false)
    RETURNING id INTO v_id;
  ELSE
    IF p_parent_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.assembly_categories WHERE parent_id = v_existing.id) THEN
      RAISE EXCEPTION 'Category with children must remain a root category';
    END IF;
    IF v_existing.type <> p_type AND (
      EXISTS (SELECT 1 FROM public.assembly_categories WHERE parent_id = v_existing.id)
      OR EXISTS (SELECT 1 FROM public.assembly_budgets WHERE category_id = v_existing.id)
      OR EXISTS (SELECT 1 FROM public.assembly_settlements WHERE category_id = v_existing.id)) THEN
      RAISE EXCEPTION 'Used category type cannot be changed';
    END IF;
    UPDATE public.assembly_categories SET type = p_type, name = btrim(p_name),
      parent_id = p_parent_id, sort_order = p_sort_order, updated_at = now()
      WHERE id = v_existing.id RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$manage_category$;

CREATE FUNCTION public.save_assembly_budgets(
  p_neighborhood_id bigint, p_fiscal_year integer, p_rows jsonb
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $save_budgets$
DECLARE
  v_actor uuid := auth.uid();
  v_status text;
  v_item jsonb;
  v_category_id bigint;
  v_amount integer;
  v_previous integer;
  v_note text;
  v_saved integer := 0;
BEGIN
  IF v_actor IS NULL OR p_neighborhood_id IS NULL OR p_neighborhood_id <= 0
     OR p_fiscal_year IS NULL OR p_fiscal_year NOT BETWEEN 2000 AND 2200
     OR p_rows IS NULL OR pg_catalog.jsonb_typeof(p_rows) <> 'array'
     OR pg_catalog.jsonb_array_length(p_rows) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Invalid budget request';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.neighborhood_admins
      WHERE neighborhood_id = p_neighborhood_id AND admin_auth_id = v_actor AND status = 'active') THEN
    RAISE EXCEPTION 'Active town membership required';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('assembly-year:' || p_neighborhood_id || ':' || p_fiscal_year, 0));
  SELECT status INTO v_status FROM public.assembly_year_closures
    WHERE neighborhood_id = p_neighborhood_id AND fiscal_year = p_fiscal_year FOR UPDATE;
  IF v_status = 'locked' THEN RAISE EXCEPTION 'Assembly year is locked'; END IF;
  IF v_status = 'unlocked' AND NOT public.assembly_actor_is_representative(p_neighborhood_id) THEN
    RAISE EXCEPTION 'Representative required during correction';
  END IF;

  FOR v_item IN SELECT item.value FROM pg_catalog.jsonb_array_elements(p_rows) AS item(value) LOOP
    IF pg_catalog.jsonb_typeof(v_item) <> 'object'
       OR (v_item->>'categoryId') !~ '^[1-9][0-9]{0,14}$'
       OR (v_item->>'amount') !~ '^(0|[1-9][0-9]{0,9})$'
       OR (v_item->>'previousAmount') !~ '^(0|[1-9][0-9]{0,9})$' THEN
      RAISE EXCEPTION 'Invalid budget row';
    END IF;
    v_category_id := (v_item->>'categoryId')::bigint;
    IF (v_item->>'amount')::bigint > 2147483647
       OR (v_item->>'previousAmount')::bigint > 2147483647 THEN
      RAISE EXCEPTION 'Budget amount out of range';
    END IF;
    v_amount := (v_item->>'amount')::integer;
    v_previous := (v_item->>'previousAmount')::integer;
    v_note := nullif(btrim(v_item->>'note'), '');
    IF length(coalesce(v_note, '')) > 500 OR NOT EXISTS (
      SELECT 1 FROM public.assembly_categories
      WHERE id = v_category_id AND neighborhood_id = p_neighborhood_id AND is_active IS TRUE
    ) THEN
      RAISE EXCEPTION 'Budget category or note invalid';
    END IF;
    INSERT INTO public.assembly_budgets
      (neighborhood_id, fiscal_year, category_id, budget_amount, previous_budget_amount, note)
    VALUES (p_neighborhood_id, p_fiscal_year, v_category_id, v_amount, v_previous, v_note)
    ON CONFLICT (neighborhood_id, fiscal_year, category_id)
    DO UPDATE SET budget_amount = EXCLUDED.budget_amount,
      previous_budget_amount = EXCLUDED.previous_budget_amount, note = EXCLUDED.note, updated_at = now();
    v_saved := v_saved + 1;
  END LOOP;
  RETURN v_saved;
END;
$save_budgets$;

REVOKE ALL ON FUNCTION public.manage_assembly_category(bigint,integer,text,bigint,text,text,bigint,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_assembly_budgets(bigint,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_assembly_category(bigint,integer,text,bigint,text,text,bigint,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_assembly_budgets(bigint,integer,jsonb) TO authenticated;
COMMIT;

SELECT p.proname AS function_name,
       pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('manage_assembly_category', 'save_assembly_budgets')
ORDER BY p.proname;
