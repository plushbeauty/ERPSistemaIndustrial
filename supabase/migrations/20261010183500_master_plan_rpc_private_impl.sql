begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.erp_master_save_plan(text, text, numeric, text, boolean, jsonb) set schema private;
alter function private.erp_master_save_plan(text, text, numeric, text, boolean, jsonb) rename to erp_master_save_plan_impl;

revoke all on function private.erp_master_save_plan_impl(text, text, numeric, text, boolean, jsonb) from public, anon;
grant execute on function private.erp_master_save_plan_impl(text, text, numeric, text, boolean, jsonb) to authenticated;

create or replace function public.erp_master_save_plan(
  p_codigo text,
  p_nome text,
  p_preco_mensal numeric,
  p_descricao text,
  p_ativo boolean,
  p_modulos jsonb
) returns jsonb
language sql
security invoker
set search_path = pg_catalog, public
as $function$
  select private.erp_master_save_plan_impl(
    p_codigo, p_nome, p_preco_mensal, p_descricao, p_ativo, p_modulos
  );
$function$;

revoke all on function public.erp_master_save_plan(text, text, numeric, text, boolean, jsonb) from public, anon;
grant execute on function public.erp_master_save_plan(text, text, numeric, text, boolean, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;