begin;

-- A document may have only one current PDF attachment; prior versions remain auditable.
create unique index if not exists erp_docq_anexos_um_vigente_por_documento_uq
  on public.erp_documentos_qualidade_anexos (empresa_id, documento_id)
  where lower(status) = 'vigente';

create or replace function public.erp_documento_qualidade_anexo_substituir(
  p_documento_id uuid,
  p_nome_arquivo text,
  p_storage_path text,
  p_tipo_mime text,
  p_tamanho_bytes bigint
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario public.erp_usuarios%rowtype;
  v_prev_ids uuid[];
  v_revisao integer;
  v_anexo_id uuid;
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada' using errcode = '42501';
  end if;
  if p_documento_id is null or nullif(trim(p_nome_arquivo), '') is null or nullif(trim(p_storage_path), '') is null then
    raise exception 'Documento, nome e caminho do PDF são obrigatórios' using errcode = '22023';
  end if;
  if coalesce(lower(p_tipo_mime), '') <> 'application/pdf' or coalesce(p_tamanho_bytes, 0) <= 0 then
    raise exception 'O anexo precisa ser um PDF válido e não vazio' using errcode = '22023';
  end if;
  if split_part(p_storage_path, '/', 1) <> v_empresa::text then
    raise exception 'O caminho do arquivo não pertence à empresa autenticada' using errcode = '42501';
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
  if coalesce(v_usuario.nivel_admin, 0) < 1
     and upper(coalesce(v_usuario.perfil, '')) not like '%QUALIDADE%'
     and upper(coalesce(v_usuario.perfil, '')) not like '%ADMIN%' then
    raise exception 'Apenas responsáveis de Qualidade ou administradores podem substituir anexos do GED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.erp_documentos_qualidade
    where id = p_documento_id and empresa_id = v_empresa
  ) then
    raise exception 'Documento não encontrado nesta empresa' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text || ':' || p_documento_id::text));

  select coalesce(max(revisao), 0) + 1
    into v_revisao
  from public.erp_documentos_qualidade_anexos
  where empresa_id = v_empresa and documento_id = p_documento_id;

  select coalesce(array_agg(id), array[]::uuid[])
    into v_prev_ids
  from public.erp_documentos_qualidade_anexos
  where empresa_id = v_empresa
    and documento_id = p_documento_id
    and lower(status) = 'vigente';

  update public.erp_documentos_qualidade_anexos
  set status = 'obsoleto',
      motivo_obsolescencia = 'Substituído por nova revisão do anexo',
      atualizado_em = now()
  where id = any(v_prev_ids)
    and empresa_id = v_empresa;

  insert into public.erp_documentos_qualidade_anexos (
    empresa_id, documento_id, nome_arquivo, storage_path, tipo_mime,
    tamanho_bytes, revisao, status, data_vigencia, criado_por, atualizado_em
  ) values (
    v_empresa, p_documento_id, trim(p_nome_arquivo), trim(p_storage_path), p_tipo_mime,
    p_tamanho_bytes, v_revisao, 'vigente', current_date, v_usuario.id, now()
  ) returning id into v_anexo_id;

  update public.erp_documentos_qualidade_anexos
  set substituido_por = v_anexo_id, atualizado_em = now()
  where id = any(v_prev_ids)
    and empresa_id = v_empresa;

  return jsonb_build_object(
    'id', v_anexo_id,
    'documento_id', p_documento_id,
    'revisao', v_revisao,
    'status', 'vigente'
  );
end;
$function$;

revoke all on function public.erp_documento_qualidade_anexo_substituir(uuid, text, text, text, bigint) from public, anon;
grant execute on function public.erp_documento_qualidade_anexo_substituir(uuid, text, text, text, bigint) to authenticated;
notify pgrst, 'reload schema';
commit;