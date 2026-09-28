-- Align ERP Master authorization with the frontend and login model.
-- Master accounts use nivel_admin >= 9.
CREATE OR REPLACE FUNCTION public.erp_is_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.erp_usuarios u
    WHERE u.auth_user_id = auth.uid()
      AND u.nivel_admin >= 9
      AND u.ativo = true
  );
$$;

REVOKE ALL ON FUNCTION public.erp_is_master() FROM anon;
GRANT EXECUTE ON FUNCTION public.erp_is_master() TO authenticated;
