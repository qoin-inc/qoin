-- 年度確定の解除、訂正、再確定を代表者に加えてシステム権限者にも許可する。

CREATE OR REPLACE FUNCTION public.el_town_actor_is_system_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(COALESCE(auth.jwt() ->> 'email', '')) = 'admin@el-town.jp';
$$;

CREATE OR REPLACE FUNCTION public.fee_actor_is_representative(target_neighborhood_id BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.el_town_actor_is_system_admin() OR EXISTS (
    SELECT 1
    FROM public.neighborhoods AS town
    WHERE town.id = target_neighborhood_id
      AND (
        town.admin_auth_id::TEXT = auth.uid()::TEXT
        OR lower(town.admin_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.assembly_actor_is_representative(target_neighborhood_id BIGINT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.el_town_actor_is_system_admin() OR EXISTS (
    SELECT 1
    FROM public.neighborhoods AS town
    WHERE town.id = target_neighborhood_id
      AND (
        town.admin_auth_id::TEXT = auth.uid()::TEXT
        OR lower(town.admin_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.el_town_actor_is_system_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.el_town_actor_is_system_admin() TO authenticated;

COMMENT ON FUNCTION public.el_town_actor_is_system_admin() IS
  'Supabase認証済みのel-townシステム権限者を判定する。';

NOTIFY pgrst, 'reload schema';
