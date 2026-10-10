create or replace function public.erp_ativar_revisao_documento(p_revisao_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario public.erp_usuarios%rowtype;
  v_revisao public.erp_qualidade_documentos_revisoes%rowtype;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada' using errcode = '42501';
  end if;

  select * into v_usuario
  from public.erp_usuarios
  where auth_user_id = auth.uid()
    and empresa_id = v_empresa
    and ativo = true
    and deleted_at is null
  limit 1;

  if v_usuario.id is null then
    raise exception 'Usuário ERP ativo não encontrado' using errcode = '42501';
  end if;

  if coalesce(v_usuario.is_master, false) is not true
     and coalesce(v_usuario.nivel_admin, 0) < 1
     and upper(coalesce(v_usuario.perfil, '')) not like '%QUALIDADE%'
     and upper(coalesce(v_usuario.perfil, '')) not like '%ADMIN%' then
    raise exception 'Apenas responsáveis de Qualidade ou administradores podem ativar documentos' using errcode = '42501';
  end if;

  select * into v_revisao
  from public.erp_qualidade_documentos_revisoes
  where id = p_revisao_id and empresa_id = v_empresa
  for update;

  if v_revisao.id is null then
    raise exception 'Revisão não encontrada nesta empresa' using errcode = 'P0002';
  end if;

  if v_revisao.status = 'OBSOLETO' then
    raise exception 'Uma revisão obsoleta não pode ser ativada diretamente' using errcode = '22023';
  end if;

  update public.erp_qualidade_documentos_revisoes
  set status = 'OBSOLETO'
  where empresa_id = v_empresa
    and codigo_documento = v_revisao.codigo_documento
    and id <> v_revisao.id
    and status in ('VIGENTE', 'ATIVA', 'EM_REVISAO');

  update public.erp_qualidade_documentos_revisoes
  set status = 'VIGENTE', data_vigencia = current_date
  where id = v_revisao.id and empresa_id = v_empresa;

  update public.erp_qualidade_documentos_editor
  set status = 'VIGENTE', data_homologacao = current_date, atualizado_em = now()
  where empresa_id = v_empresa and codigo_documento = v_revisao.codigo_documento;

  return jsonb_build_object('id', v_revisao.id, 'codigo_documento', v_revisao.codigo_documento, 'revisao', v_revisao.revisao, 'status', 'VIGENTE', 'data_vigencia', current_date);
end;
$function$;

revoke all on function public.erp_ativar_revisao_documento(uuid) from public, anon;
grant execute on function public.erp_ativar_revisao_documento(uuid) to authenticated;
