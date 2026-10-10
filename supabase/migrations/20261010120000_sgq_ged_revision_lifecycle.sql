begin;

alter table public.erp_qualidade_documentos_revisoes
  add column if not exists data_vigencia date,
  add column if not exists criado_por uuid;

do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.erp_qualidade_documentos_revisoes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.erp_qualidade_documentos_revisoes drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.erp_qualidade_documentos_revisoes
  add constraint erp_qualidade_documentos_revisoes_status_check
  check (status in ('EM_REVISAO','VIGENTE','ATIVA','OBSOLETO'));

create index if not exists erp_qualidade_documentos_revisoes_tenant_codigo_rev_idx
  on public.erp_qualidade_documentos_revisoes (empresa_id, codigo_documento, revisao desc);

create or replace function public.erp_salvar_revisao_documento(
  p_codigo text,
  p_titulo text,
  p_departamento text,
  p_conteudo text,
  p_motivo text default null
) returns jsonb
language plpgsql
security invoker
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
  if length(coalesce(p_conteudo, '')) = 0 then
    raise exception 'O conteúdo do procedimento não pode ficar vazio' using errcode = '22023';
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

  perform pg_advisory_xact_lock(hashtext(v_empresa::text || ':' || v_codigo));

  select revisao into v_revisao_atual
  from public.erp_qualidade_documentos_editor
  where empresa_id = v_empresa and codigo_documento = v_codigo
  for update;

  v_nova_revisao := coalesce(v_revisao_atual, 0) + 1;

  update public.erp_qualidade_documentos_revisoes
  set status = 'OBSOLETO'
  where empresa_id = v_empresa
    and codigo_documento = v_codigo
    and status in ('VIGENTE', 'ATIVA', 'EM_REVISAO');

  insert into public.erp_qualidade_documentos_revisoes (
    empresa_id, codigo_documento, titulo_documento, departamento,
    revisao, responsavel, status, conteudo_texto, motivo_alteracao,
    criado_por, data_vigencia
  ) values (
    v_empresa, v_codigo, v_titulo, coalesce(nullif(trim(p_departamento), ''), 'QUALIDADE'),
    v_nova_revisao, coalesce(v_usuario.nome, v_usuario.email, 'Usuário autenticado'),
    'EM_REVISAO', p_conteudo, nullif(trim(coalesce(p_motivo, '')), ''),
    v_usuario.id, null
  ) returning id into v_id;

  insert into public.erp_qualidade_documentos_editor (
    empresa_id, codigo_documento, titulo_documento, revisao,
    conteudo_texto, setor_responsavel, status, motivo_alteracao, atualizado_em
  ) values (
    v_empresa, v_codigo, v_titulo, v_nova_revisao,
    p_conteudo, coalesce(nullif(trim(p_departamento), ''), 'QUALIDADE'),
    'EM_REVISAO', nullif(trim(coalesce(p_motivo, '')), ''), now()
  )
  on conflict (empresa_id, codigo_documento) do update
    set titulo_documento = excluded.titulo_documento,
        revisao = excluded.revisao,
        conteudo_texto = excluded.conteudo_texto,
        setor_responsavel = excluded.setor_responsavel,
        status = excluded.status,
        motivo_alteracao = excluded.motivo_alteracao,
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

revoke all on function public.erp_salvar_revisao_documento(text,text,text,text,text) from public, anon;
grant execute on function public.erp_salvar_revisao_documento(text,text,text,text,text) to authenticated;

commit;