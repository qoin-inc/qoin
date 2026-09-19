-- 新しい町内会・自治会の登録時に、総会会計の標準科目を自動登録する。

CREATE OR REPLACE FUNCTION public.initialize_neighborhood_assembly_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS neighborhoods_initialize_assembly_categories
ON public.neighborhoods;

CREATE TRIGGER neighborhoods_initialize_assembly_categories
AFTER INSERT ON public.neighborhoods
FOR EACH ROW
EXECUTE FUNCTION public.initialize_neighborhood_assembly_categories();

COMMENT ON FUNCTION public.initialize_neighborhood_assembly_categories()
IS '新規町内会・自治会へ有効な総会会計標準科目を自動登録する。';
