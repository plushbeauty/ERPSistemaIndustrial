begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.erp_salvar_revisao_documento(text, text, text, text, text, text, text, text) set schema private;
alter function private.erp_salvar_revisao_documento(text, text, text, text, text, text, text, text) rename to erp_salvar_revisao_documento_impl;
alter function public.erp_ativar_revisao_documento(uuid) set schema private;
alter function private.erp_ativar_revisao_documento(uuid) rename to erp_ativar_revisao_documento_impl;

revoke all on function private.erp_salvar_revisao_documento_impl(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function private.erp_salvar_revisao_documento_impl(text, text, text, text, text, text, text, text) to authenticated;
revoke all on function private.erp_ativar_revisao_documento_impl(uuid) from public, anon;
grant execute on function private.erp_ativar_revisao_documento_impl(uuid) to authenticated;

create or replace function public.erp_salvar_revisao_documento(
  p_codigo text,
  p_titulo text,
  p_departamento text,
  p_conteudo text,
  p_motivo text default null,
  p_logo_path text default null,
  p_url_anexo text default null,
  p_nome_arquivo text default null
) returns jsonb
language sql
security invoker
set search_path = pg_catalog, public
as $function$
  select private.erp_salvar_revisao_documento_impl(
    p_codigo, p_titulo, p_departamento, p_conteudo,
    p_motivo, p_logo_path, p_url_anexo, p_nome_arquivo
  );
$function$;

create or replace function public.erp_ativar_revisao_documento(p_revisao_id uuid)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public
as $function$
  select private.erp_ativar_revisao_documento_impl(p_revisao_id);
$function$;

revoke all on function public.erp_salvar_revisao_documento(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.erp_salvar_revisao_documento(text, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.erp_ativar_revisao_documento(uuid) from public, anon;
grant execute on function public.erp_ativar_revisao_documento(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;