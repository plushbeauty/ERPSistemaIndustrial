-- Keep PostgREST entrypoints invoker-safe and move privileged implementations
-- to the non-exposed private schema. RBAC/tenant checks remain inside each RPC.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.erp_salvar_liberacao_nf(uuid,uuid,text,jsonb) set schema private;
alter function public.erp_encaminhar_liberacao_nf(uuid) set schema private;
alter function public.erp_vincular_liberacao_nfe(uuid,uuid) set schema private;
alter function public.erp_concluir_liberacao_nf(uuid) set schema private;

revoke all on function private.erp_salvar_liberacao_nf(uuid,uuid,text,jsonb) from public, anon;
revoke all on function private.erp_encaminhar_liberacao_nf(uuid) from public, anon;
revoke all on function private.erp_vincular_liberacao_nfe(uuid,uuid) from public, anon;
revoke all on function private.erp_concluir_liberacao_nf(uuid) from public, anon;
grant execute on function private.erp_salvar_liberacao_nf(uuid,uuid,text,jsonb) to authenticated;
grant execute on function private.erp_encaminhar_liberacao_nf(uuid) to authenticated;
grant execute on function private.erp_vincular_liberacao_nfe(uuid,uuid) to authenticated;
grant execute on function private.erp_concluir_liberacao_nf(uuid) to authenticated;

create or replace function public.erp_salvar_liberacao_nf(
  p_liberacao_id uuid, p_pedido_venda_id uuid, p_observacao text, p_itens jsonb
) returns uuid
language sql
security invoker
set search_path = pg_catalog, public
as $$ select private.erp_salvar_liberacao_nf(p_liberacao_id,p_pedido_venda_id,p_observacao,p_itens); $$;

create or replace function public.erp_encaminhar_liberacao_nf(p_liberacao_id uuid)
returns boolean
language sql
security invoker
set search_path = pg_catalog, public
as $$ select private.erp_encaminhar_liberacao_nf(p_liberacao_id); $$;

create or replace function public.erp_vincular_liberacao_nfe(p_liberacao_id uuid,p_documento_fiscal_id uuid)
returns boolean
language sql
security invoker
set search_path = pg_catalog, public
as $$ select private.erp_vincular_liberacao_nfe(p_liberacao_id,p_documento_fiscal_id); $$;

create or replace function public.erp_concluir_liberacao_nf(p_liberacao_id uuid)
returns boolean
language sql
security invoker
set search_path = pg_catalog, public
as $$ select private.erp_concluir_liberacao_nf(p_liberacao_id); $$;

revoke all on function public.erp_salvar_liberacao_nf(uuid,uuid,text,jsonb) from public, anon;
revoke all on function public.erp_encaminhar_liberacao_nf(uuid) from public, anon;
revoke all on function public.erp_vincular_liberacao_nfe(uuid,uuid) from public, anon;
revoke all on function public.erp_concluir_liberacao_nf(uuid) from public, anon;
grant execute on function public.erp_salvar_liberacao_nf(uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.erp_encaminhar_liberacao_nf(uuid) to authenticated;
grant execute on function public.erp_vincular_liberacao_nfe(uuid,uuid) to authenticated;
grant execute on function public.erp_concluir_liberacao_nf(uuid) to authenticated;
