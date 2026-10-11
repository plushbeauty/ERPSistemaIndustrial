create or replace function private.erp_ativar_revisao_documento_impl(p_revisao_id uuid)
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario public.erp_usuarios%rowtype;
  v_revisao public.erp_qualidade_documentos_revisoes%rowtype;
begin
  if auth.uid() is null or v_empresa is null then raise exception 'Sessão ou empresa não identificada' using errcode='42501'; end if;
  select * into v_usuario from public.erp_usuarios
  where auth_user_id=auth.uid() and empresa_id=v_empresa and ativo=true and deleted_at is null limit 1;
  if v_usuario.id is null then raise exception 'Usuário ERP ativo não encontrado' using errcode='42501'; end if;
  if coalesce(v_usuario.is_master,false) is not true and coalesce(v_usuario.nivel_admin,0)<1
     and upper(coalesce(v_usuario.perfil,'')) not like '%QUALIDADE%'
     and upper(coalesce(v_usuario.perfil,'')) not like '%ADMIN%' then
    raise exception 'Apenas responsáveis de Qualidade ou administradores podem aprovar documentos' using errcode='42501';
  end if;
  select * into v_revisao from public.erp_qualidade_documentos_revisoes
  where id=p_revisao_id and empresa_id=v_empresa for update;
  if v_revisao.id is null then raise exception 'Revisão não encontrada nesta empresa' using errcode='P0002'; end if;
  if v_revisao.status<>'EM_REVISAO' then raise exception 'Somente uma revisão em análise pode ser aprovada' using errcode='22023'; end if;
  if nullif(trim(coalesce(v_revisao.url_anexo,'')),'') is null then
    raise exception 'A revisão não pode ser aprovada sem o arquivo original anexado ao GED' using errcode='22023';
  end if;
  if exists(select 1 from public.erp_qualidade_documentos_editor e
    where e.empresa_id=v_empresa and e.codigo_documento=v_revisao.codigo_documento and e.revisao>v_revisao.revisao) then
    raise exception 'Somente a revisão mais recente pode ser aprovada' using errcode='22023';
  end if;
  update public.erp_qualidade_documentos_revisoes set status='OBSOLETO'
  where empresa_id=v_empresa and codigo_documento=v_revisao.codigo_documento and id<>v_revisao.id
    and status in ('VIGENTE','ATIVA','EM_REVISAO');
  update public.erp_qualidade_documentos_revisoes set status='VIGENTE',data_vigencia=current_date
  where id=v_revisao.id and empresa_id=v_empresa;
  update public.erp_qualidade_documentos_editor
  set status='VIGENTE',data_homologacao=current_date,atualizado_em=now()
  where empresa_id=v_empresa and codigo_documento=v_revisao.codigo_documento and revisao=v_revisao.revisao;
  return jsonb_build_object('id',v_revisao.id,'codigo_documento',v_revisao.codigo_documento,
    'revisao',v_revisao.revisao,'status','VIGENTE','data_vigencia',current_date);
end;
$function$;
