-- Optimize ERP fiscal configuration RLS init plans without changing tenant semantics.
DROP POLICY IF EXISTS erp_config_fiscal_select_tenant ON public.erp_config_fiscal;
CREATE POLICY erp_config_fiscal_select_tenant
ON public.erp_config_fiscal
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.erp_usuarios u
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.ativo = true
      AND u.deleted_at IS NULL
      AND (u.empresa_id = erp_config_fiscal.empresa_id OR u.is_master = true)
  )
);

DROP POLICY IF EXISTS erp_config_fiscal_write_tenant ON public.erp_config_fiscal;
CREATE POLICY erp_config_fiscal_write_tenant
ON public.erp_config_fiscal
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.erp_usuarios u
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.ativo = true
      AND u.deleted_at IS NULL
      AND (u.empresa_id = erp_config_fiscal.empresa_id OR u.is_master = true)
      AND upper(COALESCE(u.perfil, '')) IN ('MASTER', 'ADMIN', 'ADMINISTRADOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.erp_usuarios u
    WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.ativo = true
      AND u.deleted_at IS NULL
      AND (u.empresa_id = erp_config_fiscal.empresa_id OR u.is_master = true)
      AND upper(COALESCE(u.perfil, '')) IN ('MASTER', 'ADMIN', 'ADMINISTRADOR')
  )
);
