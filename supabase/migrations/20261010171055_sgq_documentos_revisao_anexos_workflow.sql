begin;

-- Add the attachment fields consumed by the existing SGQ screens.
alter table public.erp_qualidade_documentos_editor
  add column if not exists logo_path text;

alter table public.erp_qualidade_documentos_revisoes
  add column if not exists url_anexo text,
  add column if not exists nome_arquivo text;

-- Keep the currently approved revision active until a new revision is approved.
-- All file paths must be scoped to the authenticated tenant's Storage folder.
drop function if exists public.erp_salvar_revisao_documento(text, text, text, text, text);

create function public.erp_salvar_revisao_documento(
  p_codigo text,
  p_titulo text,
  p_departamento text,
  p_conteudo text,
  p_motivo text default null,
  p_logo_path text default null,
  p_url_anexo text default null,
  p_nome_arquivo text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario public.erp_usuarios%rowtype;
  v_revisao_atual integer;
  v_nova_revisao integer;
  v_id uuid;
  v_codigo text := upper(trim(coalesce(p_codigo, '')));
  v_titulo text := trim(coalesce(p_titulo, ''));
begin
  if auth.uid() is null then
    raise exception 'Sessão não autenticada' using errcode = '28000';
  end if;
  if v_empresa is null then
    raise exception 'Empresa não identificada para a sessão atual' using errcode = '42501';
  end if;
  if v_codigo = '' or v_titulo = '' then
    raise exception 'Código e título são obrigatórios' using errcode = '22023';
  end if;
  if length(coalesce(p_conteudo, '')) = 0 and p_url_anexo is null then
    raise exception 'Informe o conteúdo do procedimento ou anexe um PDF' using errcode = '22023';
  end if;
  if p_logo_path is not null and split_part(p_logo_path, '/', 1) <> v_empresa::text then
    raise exception 'O logotipo precisa pertencer à empresa autenticada' using errcode = '42501';
  end if;
  if p_url_anexo is not null and split_part(p_url_anexo, '/', 1) <> v_empresa::text then
    raise exception 'O anexo precisa pertencer à empresa autenticada' using errcode = '42501';
  end if;

  select * into v_usuario
  from public.erp_usuarios
  where auth_user_id = auth.uid()
    and empresa_id = v_empresa
    and ativo = true
    and deleted_at is null
  limit 1;

  if v_usuario.id is null then
    raise exception 'Usuário ERP ativo não encontrado para a empresa' using errcode = '42501';
  end if;

  if coalesce(v_usuario.is_master, false) is not true
     and coalesce(v_usuario.nivel_admin, 0) < 1
     and upper(coalesce(v_usuario.perfil, '')) not like '%QUALIDADE%'
     and upper(coalesce(v_usuario.perfil, '')) not like '%ADMIN%' then
    raise exception 'Apenas responsáveis de Qualidade ou administradores podem salvar documentos' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text || ':' || v_codigo));

  select revisao into v_revisao_atual
  from public.erp_qualidade_documentos_editor
  where empresa_id = v_empresa and codigo_documento = v_codigo
  for update;

  v_nova_revisao := coalesce(v_revisao_atual, 0) + 1;

  insert into public.erp_qualidade_documentos_revisoes (
    empresa_id, codigo_documento, titulo_documento, departamento,
    revisao, responsavel, status, conteudo_texto, motivo_alteracao,
    criado_por, data_vigencia, url_anexo, nome_arquivo
  ) values (
    v_empresa, v_codigo, v_titulo,
    coalesce(nullif(trim(p_departamento), ''), 'QUALIDADE'),
    v_nova_revisao, coalesce(v_usuario.nome, v_usuario.email, 'Usuário autenticado'),
    'EM_REVISAO', coalesce(p_conteudo, ''),
    nullif(trim(coalesce(p_motivo, '')), ''),
    v_usuario.id, null, p_url_anexo, p_nome_arquivo
  ) returning id into v_id;

  insert into public.erp_qualidade_documentos_editor (
    empresa_id, codigo_documento, titulo_documento, revisao,
    conteudo_texto, setor_responsavel, status, motivo_alteracao,
    logo_path, data_homologacao, atualizado_em
  ) values (
    v_empresa, v_codigo, v_titulo, v_nova_revisao,
    coalesce(p_conteudo, ''),
    coalesce(nullif(trim(p_departamento), ''), 'QUALIDADE'),
    'EM_REVISAO', nullif(trim(coalesce(p_motivo, '')), ''),
    p_logo_path, null, now()
  )
  on conflict (empresa_id, codigo_documento) do update
    set titulo_documento = excluded.titulo_documento,
        revisao = excluded.revisao,
        conteudo_texto = excluded.conteudo_texto,
        setor_responsavel = excluded.setor_responsavel,
        status = 'EM_REVISAO',
        motivo_alteracao = excluded.motivo_alteracao,
        logo_path = coalesce(excluded.logo_path, public.erp_qualidade_documentos_editor.logo_path),
        data_homologacao = null,
        atualizado_em = now();

  return jsonb_build_object(
    'id', v_id,
    'codigo_documento', v_codigo,
    'revisao', v_nova_revisao,
    'status', 'EM_REVISAO',
    'responsavel', coalesce(v_usuario.nome, v_usuario.email),
    'criado_em', now()
  );
end;
$function$;

-- The approval RPC performs the controlled status transition under explicit tenant and role checks.
create or replace function public.erp_ativar_revisao_documento(p_revisao_id uuid)
returns jsonb
language plpgsql
security definer
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
    raise exception 'Apenas responsáveis de Qualidade ou administradores podem aprovar documentos' using errcode = '42501';
  end if;

  select * into v_revisao
  from public.erp_qualidade_documentos_revisoes
  where id = p_revisao_id and empresa_id = v_empresa
  for update;

  if v_revisao.id is null then
    raise exception 'Revisão não encontrada nesta empresa' using errcode = 'P0002';
  end if;

  if v_revisao.status <> 'EM_REVISAO' then
    raise exception 'Somente uma revisão em análise pode ser aprovada' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.erp_qualidade_documentos_editor e
    where e.empresa_id = v_empresa
      and e.codigo_documento = v_revisao.codigo_documento
      and e.revisao > v_revisao.revisao
  ) then
    raise exception 'Somente a revisão mais recente pode ser aprovada' using errcode = '22023';
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
  where empresa_id = v_empresa
    and codigo_documento = v_revisao.codigo_documento
    and revisao = v_revisao.revisao;

  return jsonb_build_object(
    'id', v_revisao.id,
    'codigo_documento', v_revisao.codigo_documento,
    'revisao', v_revisao.revisao,
    'status', 'VIGENTE',
    'data_vigencia', current_date
  );
end;
$function$;

revoke all on function public.erp_salvar_revisao_documento(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.erp_salvar_revisao_documento(text, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.erp_ativar_revisao_documento(uuid) from public, anon;
grant execute on function public.erp_ativar_revisao_documento(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
