create table if not exists public.erp_nfe_numeradores (
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  modelo text not null check (modelo = '55'),
  serie integer not null check (serie between 0 and 999),
  ultimo_numero bigint not null check (ultimo_numero >= 0),
  updated_at timestamptz not null default now(),
  primary key (empresa_id, modelo, serie)
);

alter table public.erp_regras_fiscais
  add column if not exists pis_cst text,
  add column if not exists cofins_cst text;

alter table public.erp_documentos_fiscais_itens
  add column if not exists cst_ipi text;

alter table public.erp_config_fiscal
  add column if not exists regime_tributario text;

alter table public.erp_config_fiscal
  drop constraint if exists erp_config_fiscal_regime_tributario_check;
alter table public.erp_config_fiscal
  add constraint erp_config_fiscal_regime_tributario_check
  check (regime_tributario is null or regime_tributario in ('SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'));

update storage.buckets
set allowed_mime_types = array(
  select distinct mime_type
  from unnest(coalesce(allowed_mime_types, '{}'::text[]) || array['application/xml', 'text/xml']::text[]) as mime_type
)
where id = 'documentos-erp';

alter table public.erp_nfe_numeradores enable row level security;
drop policy if exists erp_nfe_numeradores_select_tenant on public.erp_nfe_numeradores;
create policy erp_nfe_numeradores_select_tenant
  on public.erp_nfe_numeradores for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

revoke all on public.erp_nfe_numeradores from anon, authenticated;
grant select on public.erp_nfe_numeradores to authenticated;

create or replace function public.erp_reservar_numero_nfe(p_serie integer)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_numero bigint;
  v_usuario_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão de autenticação obrigatória' using errcode = '42501';
  end if;
  if v_empresa_id is null or p_serie < 0 or p_serie > 999 then
    raise exception 'Empresa ou série fiscal inválida' using errcode = '22023';
  end if;
  if not public.erp_has_permission('fiscal', 'emitir') then
    raise exception 'Usuário sem permissão fiscal para reservar numeração' using errcode = '42501';
  end if;
  select id into v_usuario_id
  from public.erp_usuarios
  where auth_user_id = auth.uid() and empresa_id = v_empresa_id and ativo = true and deleted_at is null
  limit 1;
  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não localizado para registrar a reserva' using errcode = '42501';
  end if;

  insert into public.erp_nfe_numeradores (empresa_id, modelo, serie, ultimo_numero)
  values (
    v_empresa_id,
    '55',
    p_serie,
    greatest(
      0,
      coalesce((
        select max(d.numero)::bigint
        from public.erp_documentos_fiscais d
        where d.empresa_id = v_empresa_id
          and d.modelo = '55'
          and d.serie = p_serie
          and d.numero is not null
      ), 0)
    ) + 1
  )
  on conflict (empresa_id, modelo, serie) do update
    set ultimo_numero = greatest(
      public.erp_nfe_numeradores.ultimo_numero,
      coalesce((
        select max(d.numero)::bigint
        from public.erp_documentos_fiscais d
        where d.empresa_id = v_empresa_id
          and d.modelo = '55'
          and d.serie = p_serie
          and d.numero is not null
      ), 0)
    ) + 1,
    updated_at = now()
  returning ultimo_numero into v_numero;

  insert into public.erp_logs_sistema (
    empresa_id, usuario_id, modulo, acao, entidade, entidade_id, dados
  )
  values (
    v_empresa_id, v_usuario_id, 'Fiscal', 'NFE_NUMERO_RESERVADO',
    'erp_documentos_fiscais', null,
    jsonb_build_object('modelo', '55', 'serie', p_serie, 'numero', v_numero)
  );

  return v_numero;
end;
$$;

revoke all on function public.erp_reservar_numero_nfe(integer) from public, anon;
grant execute on function public.erp_reservar_numero_nfe(integer) to authenticated;

create or replace function public.erp_iniciar_emissao_nfe(p_documento_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_doc public.erp_documentos_fiscais%rowtype;
  v_usuario_id uuid;
begin
  if auth.uid() is null or v_empresa_id is null then
    raise exception 'Sessão ou empresa não identificada' using errcode = '42501';
  end if;
  if not public.erp_has_permission('fiscal', 'emitir') then
    raise exception 'Usuário sem permissão fiscal para emitir NF-e' using errcode = '42501';
  end if;

  select * into v_doc
  from public.erp_documentos_fiscais
  where id = p_documento_id and empresa_id = v_empresa_id
  for update;

  if not found then
    raise exception 'Documento fiscal não encontrado para a empresa da sessão';
  end if;
  if v_doc.modelo <> '55' or v_doc.status <> 'Rascunho' then
    raise exception 'Somente rascunhos NF-e podem iniciar transmissão';
  end if;
  if v_doc.numero is null or v_doc.serie is null then
    raise exception 'Série e número fiscal devem estar reservados antes da transmissão';
  end if;

  update public.erp_documentos_fiscais
  set status = 'Processando',
      mensagem_retorno = 'Transmissão solicitada ao integrador fiscal; aguardando retorno.',
      updated_at = now()
  where id = p_documento_id and empresa_id = v_empresa_id;

  select id into v_usuario_id
  from public.erp_usuarios
  where auth_user_id = auth.uid() and ativo = true
  limit 1;
  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não localizado para auditoria' using errcode = '42501';
  end if;

  insert into public.erp_logs_sistema (
    empresa_id, usuario_id, modulo, acao, entidade, entidade_id, dados
  ) values (
    v_empresa_id, v_usuario_id, 'Fiscal', 'NFE_TRANSMISSAO_INICIADA',
    'erp_documentos_fiscais', p_documento_id,
    jsonb_build_object('serie', v_doc.serie, 'numero', v_doc.numero)
  );

  return true;
end;
$$;

revoke all on function public.erp_iniciar_emissao_nfe(uuid) from public, anon;
grant execute on function public.erp_iniciar_emissao_nfe(uuid) to authenticated;
