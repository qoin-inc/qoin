-- 2026-07-12
-- 町内会の有効な管理者が、自町内会の会員名簿を登録・更新できるようにするRLSポリシー。
-- Supabase SQL Editorで実行してください。

ALTER TABLE public.resident_rosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resident_rosters_insert_active_admins
ON public.resident_rosters;

CREATE POLICY resident_rosters_insert_active_admins
ON public.resident_rosters
FOR INSERT
TO authenticated
WITH CHECK (
  neighborhood_id IN (
    SELECT admins.neighborhood_id
    FROM public.neighborhood_admins admins
    WHERE admins.admin_auth_id = auth.uid()
      AND admins.status = 'active'
  )
);

DROP POLICY IF EXISTS resident_rosters_update_active_admins
ON public.resident_rosters;

CREATE POLICY resident_rosters_update_active_admins
ON public.resident_rosters
FOR UPDATE
TO authenticated
USING (
  neighborhood_id IN (
    SELECT admins.neighborhood_id
    FROM public.neighborhood_admins admins
    WHERE admins.admin_auth_id = auth.uid()
      AND admins.status = 'active'
  )
)
WITH CHECK (
  neighborhood_id IN (
    SELECT admins.neighborhood_id
    FROM public.neighborhood_admins admins
    WHERE admins.admin_auth_id = auth.uid()
      AND admins.status = 'active'
  )
);

DROP POLICY IF EXISTS resident_rosters_delete_active_admins
ON public.resident_rosters;

CREATE POLICY resident_rosters_delete_active_admins
ON public.resident_rosters
FOR DELETE
TO authenticated
USING (
  neighborhood_id IN (
    SELECT admins.neighborhood_id
    FROM public.neighborhood_admins admins
    WHERE admins.admin_auth_id = auth.uid()
      AND admins.status = 'active'
  )
);
