-- 総会会計: 科目削除時に決算明細を削除せず「未設定項目」にするための追加SQL
-- Supabase SQL Editorで全文を実行してください。

ALTER TABLE public.assembly_settlements
  ALTER COLUMN category_id DROP NOT NULL;

DO $$
DECLARE
  target_constraint TEXT;
BEGIN
  FOR target_constraint IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'assembly_settlements'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) ILIKE '%assembly_categories%'
  LOOP
    EXECUTE format('ALTER TABLE public.assembly_settlements DROP CONSTRAINT %I', target_constraint);
  END LOOP;
END $$;

ALTER TABLE public.assembly_settlements
  ADD CONSTRAINT assembly_settlements_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES public.assembly_categories(id)
  ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';

SELECT
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'assembly_settlements'
  AND column_name = 'category_id';
