REVOKE EXECUTE ON FUNCTION public.erp_mrp_explodir(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.erp_mrp_explodir(uuid, numeric, text) TO authenticated, service_role;