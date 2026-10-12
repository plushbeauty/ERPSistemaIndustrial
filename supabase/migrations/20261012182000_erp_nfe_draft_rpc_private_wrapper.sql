-- Keep the public PostgREST RPC as SECURITY INVOKER. Its implementation is
-- private, SECURITY DEFINER, tenant-scoped and permission-checked.
alter function public.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) set schema private;

revoke all on function private.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) from public, anon;
grant execute on function private.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) to authenticated;

create or replace function public.erp_salvar_rascunho_nfe(
  p_documento_id uuid,
  p_documento jsonb,
  p_itens jsonb
) returns uuid
language sql
security invoker
set search_path = pg_catalog, public
as $wrapper$
  select private.erp_salvar_rascunho_nfe(p_documento_id,p_documento,p_itens);
$wrapper$;

revoke all on function public.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.erp_salvar_rascunho_nfe(uuid,jsonb,jsonb) to authenticated;
