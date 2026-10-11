create or replace function private.erp_qualidade_revisao_anexo_vincular_impl(
  p_revisao_id uuid, p_nome_arquivo text, p_storage_path text, p_tipo_mime text, p_tamanho_bytes bigint
) returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, storage
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario public.erp_usuarios%rowtype;
  v_revisao public.erp_qualidade_documentos_revisoes%rowtype;
begin
  if auth.uid() is null or v_empresa is null then raise exception 'Sessão ou empresa não identificada' using errcode='42501'; end if;
  if p_revisao_id is null or nullif(trim(p_nome_arquivo),'') is null or nullif(trim(p_storage_path),'') is null
     or coalesce(p_tamanho_bytes,0)<=0 or p_tamanho_bytes>52428800 then
    raise exception 'Documento, nome, caminho e arquivo de até 50 MB são obrigatórios' using errcode='22023';
  end if;
  if split_part(p_storage_path,'/',1)<>v_empresa::text then raise exception 'O caminho do anexo não pertence à empresa autenticada' using errcode='42501'; end if;
  if lower(coalesce(p_tipo_mime,'')) not in (
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroenabled.12'
  ) then raise exception 'Formato de anexo não permitido' using errcode='22023'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='erp-qualidade-anexos' and o.name=p_storage_path) then
    raise exception 'Arquivo não encontrado no armazenamento privado do SGQ' using errcode='P0002';
  end if;
  select * into v_usuario from public.erp_usuarios
  where auth_user_id=auth.uid() and empresa_id=v_empresa and ativo=true and deleted_at is null limit 1;
  if v_usuario.id is null then raise exception 'Usuário ERP ativo não encontrado' using errcode='42501'; end if;
  if coalesce(v_usuario.is_master,false) is not true and coalesce(v_usuario.nivel_admin,0)<1
     and upper(coalesce(v_usuario.perfil,'')) not like '%QUALIDADE%'
     and upper(coalesce(v_usuario.perfil,'')) not like '%ADMIN%' then
    raise exception 'Apenas responsáveis de Qualidade ou administradores podem anexar documentos' using errcode='42501';
  end if;
  select * into v_revisao from public.erp_qualidade_documentos_revisoes
  where id=p_revisao_id and empresa_id=v_empresa for update;
  if v_revisao.id is null then raise exception 'Revisão não encontrada nesta empresa' using errcode='P0002'; end if;
  if v_revisao.status<>'EM_REVISAO' then raise exception 'Somente uma revisão em análise pode receber anexo' using errcode='22023'; end if;
  if exists(select 1 from public.erp_qualidade_documentos_editor e
    where e.empresa_id=v_empresa and e.codigo_documento=v_revisao.codigo_documento and e.revisao>v_revisao.revisao) then
    raise exception 'Somente a revisão mais recente pode receber anexo' using errcode='22023';
  end if;
  update public.erp_qualidade_documentos_revisoes set url_anexo=trim(p_storage_path),nome_arquivo=trim(p_nome_arquivo)
  where id=v_revisao.id and empresa_id=v_empresa;
  return jsonb_build_object('id',v_revisao.id,'codigo_documento',v_revisao.codigo_documento,
    'revisao',v_revisao.revisao,'nome_arquivo',trim(p_nome_arquivo),'status',v_revisao.status);
end;
$$;
revoke all on function private.erp_qualidade_revisao_anexo_vincular_impl(uuid,text,text,text,bigint) from public,anon;
grant execute on function private.erp_qualidade_revisao_anexo_vincular_impl(uuid,text,text,text,bigint) to authenticated;
create or replace function public.erp_qualidade_revisao_anexo_vincular(
  p_revisao_id uuid,p_nome_arquivo text,p_storage_path text,p_tipo_mime text,p_tamanho_bytes bigint
) returns jsonb language sql security invoker set search_path=pg_catalog,public
as $$ select private.erp_qualidade_revisao_anexo_vincular_impl(p_revisao_id,p_nome_arquivo,p_storage_path,p_tipo_mime,p_tamanho_bytes); $$;
revoke all on function public.erp_qualidade_revisao_anexo_vincular(uuid,text,text,text,bigint) from public,anon;
grant execute on function public.erp_qualidade_revisao_anexo_vincular(uuid,text,text,text,bigint) to authenticated;
