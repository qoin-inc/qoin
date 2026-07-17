-- system管理者を既存・新規の全町内会／自治会へ有効役員として登録する。
-- system画面では、この認証UUIDのSupabaseセッションを使って役員と同じRLS操作を行う。

CREATE OR REPLACE FUNCTION public.ensure_system_admin_for_neighborhood()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  system_admin_id UUID;
BEGIN
  SELECT users.id
    INTO system_admin_id
  FROM auth.users AS users
  WHERE lower(users.email) = lower('admin@el-town.jp')
  ORDER BY users.created_at
  LIMIT 1;

  IF system_admin_id IS NULL THEN
    RAISE EXCEPTION 'Supabase Auth user admin@el-town.jp was not found';
  END IF;

  INSERT INTO public.neighborhood_admins (
    neighborhood_id,
    admin_auth_id,
    admin_name,
    admin_email,
    status
  )
  VALUES (
    NEW.id,
    system_admin_id,
    'システム管理者',
    'admin@el-town.jp',
    'active'
  )
  ON CONFLICT (neighborhood_id, admin_email)
  DO UPDATE SET
    admin_auth_id = EXCLUDED.admin_auth_id,
    admin_name = EXCLUDED.admin_name,
    status = 'active';

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_system_admin_for_neighborhood() FROM PUBLIC;

DROP TRIGGER IF EXISTS neighborhoods_add_system_admin
ON public.neighborhoods;

CREATE TRIGGER neighborhoods_add_system_admin
AFTER INSERT ON public.neighborhoods
FOR EACH ROW
EXECUTE FUNCTION public.ensure_system_admin_for_neighborhood();

WITH system_admin AS (
  SELECT users.id
  FROM auth.users AS users
  WHERE lower(users.email) = lower('admin@el-town.jp')
  ORDER BY users.created_at
  LIMIT 1
)
INSERT INTO public.neighborhood_admins (
  neighborhood_id,
  admin_auth_id,
  admin_name,
  admin_email,
  status
)
SELECT
  neighborhoods.id,
  system_admin.id,
  'システム管理者',
  'admin@el-town.jp',
  'active'
FROM public.neighborhoods AS neighborhoods
CROSS JOIN system_admin
ON CONFLICT (neighborhood_id, admin_email)
DO UPDATE SET
  admin_auth_id = EXCLUDED.admin_auth_id,
  admin_name = EXCLUDED.admin_name,
  status = 'active';

NOTIFY pgrst, 'reload schema';
