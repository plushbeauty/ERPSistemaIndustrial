-- SYSNQRA ERP INDUSTRIAL
-- Templates versionados de inspeção por produto/operação.
-- Inclui snapshot imutável na inspeção em processo; não executa DDL remoto nesta entrega.

begin;

create table if not exists public.erp_qualidade_inspecao_templates (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo text not null,
  nome text not null,
  produto_id uuid null,
  operacao text not null,
  revisao integer not null default 1,
  status text not null default 'RASCUNHO'
    check (status in ('RASCUNHO', 'VIGENTE', 'OBSOLETO')),
  vigencia_inicio date null,
  vigencia_fim date null,
  criado_por uuid null default auth.uid(),
  aprovado_por uuid null,
  aprovado_em timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_qualidade_inspecao_templates_codigo_revisao_uq
    unique (empresa_id, codigo, revisao),
  constraint erp_qualidade_inspecao_templates_empresa_id_uq
    unique (empresa_id, id),
  constraint erp_qualidade_inspecao_templates_revisao_ck check (revisao > 0),
  constraint erp_qualidade_inspecao_templates_vigencia_ck
    check (vigencia_fim is null or vigencia_inicio is null or vigencia_fim >= vigencia_inicio)
);

create table if not exists public.erp_qualidade_inspecao_template_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  template_id uuid not null,
  sequencia integer not null,
  codigo_item text not null,
  caracteristica text not null,
  metodo text null,
  unidade text null,
  valor_nominal numeric(18,6) null,
  limite_inferior numeric(18,6) null,
  limite_superior numeric(18,6) null,
  tipo_resposta text not null default 'NUMERICO'
    check (tipo_resposta in ('NUMERICO', 'TEXTO', 'SIM_NAO', 'CONFORME_NAO_CONFORME')),
  criticidade text not null default 'MEDIA'
    check (criticidade in ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
  obrigatorio boolean not null default true,
  instrucoes text null,
  created_at timestamptz not null default now(),
  constraint erp_qualidade_inspecao_template_itens_ordem_uq
    unique (empresa_id, template_id, sequencia),
  constraint erp_qualidade_inspecao_template_itens_empresa_template_fk
    foreign key (empresa_id, template_id)
    references public.erp_qualidade_inspecao_templates (empresa_id, id)
    on delete cascade,
  constraint erp_qualidade_inspecao_template_itens_limites_ck
    check (limite_inferior is null or limite_superior is null or limite_inferior <= limite_superior)
);

create unique index if not exists uq_erp_qualidade_inspecao_templates_empresa_id_id
  on public.erp_qualidade_inspecao_templates (empresa_id, id);
create index if not exists idx_erp_qualidade_inspecao_templates_ativas
  on public.erp_qualidade_inspecao_templates (empresa_id, status, produto_id, operacao, codigo);
create index if not exists idx_erp_qualidade_inspecao_template_itens_ordem
  on public.erp_qualidade_inspecao_template_itens (empresa_id, template_id, sequencia);

create unique index if not exists uq_erp_produtos_empresa_id_id
  on public.erp_produtos (empresa_id, id);

do $
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'erp_qualidade_inspecao_templates_produto_fk'
       and conrelid = 'public.erp_qualidade_inspecao_templates'::regclass
  ) then
    alter table public.erp_qualidade_inspecao_templates
      add constraint erp_qualidade_inspecao_templates_produto_fk
      foreign key (empresa_id, produto_id)
      references public.erp_produtos (empresa_id, id)
      on delete restrict;
  end if;
end;
$;

alter table public.erp_inspecoes
  add column if not exists template_id uuid,
  add column if not exists template_revisao integer,
  add column if not exists template_snapshot jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'erp_inspecoes_template_empresa_fk'
       and conrelid = 'public.erp_inspecoes'::regclass
  ) then
    alter table public.erp_inspecoes
      add constraint erp_inspecoes_template_empresa_fk
      foreign key (empresa_id, template_id)
      references public.erp_qualidade_inspecao_templates (empresa_id, id)
      on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
     where conname = 'erp_inspecoes_template_revisao_ck'
       and conrelid = 'public.erp_inspecoes'::regclass
  ) then
    alter table public.erp_inspecoes
      add constraint erp_inspecoes_template_revisao_ck
      check (template_id is null or template_revisao is not null);
  end if;
end;
$$;

alter table public.erp_qualidade_inspecao_templates enable row level security;
alter table public.erp_qualidade_inspecao_template_itens enable row level security;

drop policy if exists erp_qualidade_inspecao_templates_select_tenant on public.erp_qualidade_inspecao_templates;
drop policy if exists erp_qualidade_inspecao_templates_insert_admin on public.erp_qualidade_inspecao_templates;
drop policy if exists erp_qualidade_inspecao_templates_update_admin on public.erp_qualidade_inspecao_templates;
drop policy if exists erp_qualidade_inspecao_templates_delete_draft_admin on public.erp_qualidade_inspecao_templates;
drop policy if exists erp_qualidade_inspecao_template_itens_select_tenant on public.erp_qualidade_inspecao_template_itens;
drop policy if exists erp_qualidade_inspecao_template_itens_insert_admin on public.erp_qualidade_inspecao_template_itens;
drop policy if exists erp_qualidade_inspecao_template_itens_update_admin on public.erp_qualidade_inspecao_template_itens;
drop policy if exists erp_qualidade_inspecao_template_itens_delete_admin on public.erp_qualidade_inspecao_template_itens;

create policy erp_qualidade_inspecao_templates_select_tenant
  on public.erp_qualidade_inspecao_templates
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

create policy erp_qualidade_inspecao_templates_insert_admin
  on public.erp_qualidade_inspecao_templates
  for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and status = 'RASCUNHO'
    and exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = public.erp_current_empresa_id()
         and u.ativo is true and u.deleted_at is null
         and coalesce(u.nivel_admin, 0) >= 8
    )
  );

create policy erp_qualidade_inspecao_templates_update_admin
  on public.erp_qualidade_inspecao_templates
  for update to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and status = 'RASCUNHO'
    and exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = public.erp_current_empresa_id()
         and u.ativo is true and u.deleted_at is null
         and coalesce(u.nivel_admin, 0) >= 8
    )
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and status = 'RASCUNHO'
  );

create policy erp_qualidade_inspecao_templates_delete_draft_admin
  on public.erp_qualidade_inspecao_templates
  for delete to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and status = 'RASCUNHO'
    and exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = public.erp_current_empresa_id()
         and u.ativo is true and u.deleted_at is null
         and coalesce(u.nivel_admin, 0) >= 8
    )
  );

create policy erp_qualidade_inspecao_template_itens_select_tenant
  on public.erp_qualidade_inspecao_template_itens
  for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

create policy erp_qualidade_inspecao_template_itens_insert_admin
  on public.erp_qualidade_inspecao_template_itens
  for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = public.erp_current_empresa_id()
         and u.ativo is true and u.deleted_at is null
         and coalesce(u.nivel_admin, 0) >= 8
    )
  );

create policy erp_qualidade_inspecao_template_itens_update_admin
  on public.erp_qualidade_inspecao_template_itens
  for update to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = public.erp_current_empresa_id()
         and u.ativo is true and u.deleted_at is null
         and coalesce(u.nivel_admin, 0) >= 8
    )
  )
  with check (empresa_id = public.erp_current_empresa_id());

create policy erp_qualidade_inspecao_template_itens_delete_admin
  on public.erp_qualidade_inspecao_template_itens
  for delete to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_usuarios u
       where u.auth_user_id = auth.uid()
         and u.empresa_id = public.erp_current_empresa_id()
         and u.ativo is true and u.deleted_at is null
         and coalesce(u.nivel_admin, 0) >= 8
    )
  );

grant select, insert, update, delete on public.erp_qualidade_inspecao_templates to authenticated;
grant select, insert, update, delete on public.erp_qualidade_inspecao_template_itens to authenticated;

create or replace function public.erp_qualidade_inspecao_template_proteger_vigente()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' and old.status = 'VIGENTE' then
    raise exception 'TEMPLATE_VIGENTE_IMUTAVEL_CRIE_NOVA_REVISAO';
  end if;
  if tg_op = 'UPDATE' and old.status = 'VIGENTE' and (
    new.codigo is distinct from old.codigo
    or new.nome is distinct from old.nome
    or new.produto_id is distinct from old.produto_id
    or new.operacao is distinct from old.operacao
    or new.revisao is distinct from old.revisao
  ) then
    raise exception 'TEMPLATE_VIGENTE_IMUTAVEL_CRIE_NOVA_REVISAO';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_erp_qualidade_inspecao_template_proteger_vigente
  on public.erp_qualidade_inspecao_templates;
create trigger trg_erp_qualidade_inspecao_template_proteger_vigente
before update or delete on public.erp_qualidade_inspecao_templates
for each row execute function public.erp_qualidade_inspecao_template_proteger_vigente();

create or replace function public.erp_qualidade_inspecao_template_item_proteger_vigente()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_template_id uuid;
  v_status text;
begin
  v_template_id := case when tg_op = 'DELETE' then old.template_id else new.template_id end;
  select t.status into v_status
    from public.erp_qualidade_inspecao_templates t
   where t.id = v_template_id
     and t.empresa_id = case when tg_op = 'DELETE' then old.empresa_id else new.empresa_id end;
  if v_status = 'VIGENTE' then
    raise exception 'ITENS_DE_TEMPLATE_VIGENTE_IMUTAVEIS_CRIE_NOVA_REVISAO';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_erp_qualidade_inspecao_template_item_proteger_vigente
  on public.erp_qualidade_inspecao_template_itens;
create trigger trg_erp_qualidade_inspecao_template_item_proteger_vigente
before insert or update or delete on public.erp_qualidade_inspecao_template_itens
for each row execute function public.erp_qualidade_inspecao_template_item_proteger_vigente();

create or replace function public.erp_qualidade_inspecao_template_nova_revisao(p_template_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_nivel_admin integer;
  v_origem public.erp_qualidade_inspecao_templates%rowtype;
  v_nova_id uuid;
  v_revisao integer;
begin
  select u.id, u.nivel_admin into v_usuario_id, v_nivel_admin
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa
     and u.ativo is true and u.deleted_at is null
   limit 1;
  if v_empresa is null or v_usuario_id is null or coalesce(v_nivel_admin, 0) < 8 then
    raise exception 'NIVEL_ADMIN_INSUFICIENTE_PARA_NOVA_REVISAO';
  end if;

  select t.* into v_origem
    from public.erp_qualidade_inspecao_templates t
   where t.id = p_template_id and t.empresa_id = v_empresa
   for update;
  if not found then raise exception 'TEMPLATE_NAO_ENCONTRADO_NA_EMPRESA'; end if;

  select coalesce(max(t.revisao), 0) + 1 into v_revisao
    from public.erp_qualidade_inspecao_templates t
   where t.empresa_id = v_empresa and t.codigo = v_origem.codigo;

  insert into public.erp_qualidade_inspecao_templates (
    empresa_id, codigo, nome, produto_id, operacao, revisao, status, criado_por
  ) values (
    v_empresa, v_origem.codigo, v_origem.nome, v_origem.produto_id,
    v_origem.operacao, v_revisao, 'RASCUNHO', auth.uid()
  )
  returning id into v_nova_id;

  insert into public.erp_qualidade_inspecao_template_itens (
    empresa_id, template_id, sequencia, codigo_item, caracteristica, metodo,
    unidade, valor_nominal, limite_inferior, limite_superior, tipo_resposta,
    criticidade, obrigatorio, instrucoes
  )
  select
    v_empresa, v_nova_id, i.sequencia, i.codigo_item, i.caracteristica, i.metodo,
    i.unidade, i.valor_nominal, i.limite_inferior, i.limite_superior, i.tipo_resposta,
    i.criticidade, i.obrigatorio, i.instrucoes
  from public.erp_qualidade_inspecao_template_itens i
  where i.empresa_id = v_empresa and i.template_id = p_template_id
  order by i.sequencia;

  return v_nova_id;
end;
$$;

create or replace function public.erp_qualidade_inspecao_template_salvar_itens(
  p_template_id uuid,
  p_itens jsonb
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_nivel_admin integer;
  v_template public.erp_qualidade_inspecao_templates%rowtype;
  v_item jsonb;
  v_ordem integer := 0;
begin
  select u.id, u.nivel_admin into v_usuario_id, v_nivel_admin
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa
     and u.ativo is true and u.deleted_at is null
   limit 1;
  if v_empresa is null or v_usuario_id is null or coalesce(v_nivel_admin, 0) < 8 then
    raise exception 'NIVEL_ADMIN_INSUFICIENTE_PARA_EDITAR_TEMPLATE';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'TEMPLATE_PRECISA_DE_AO_MENOS_UM_ITEM';
  end if;

  select t.* into v_template
    from public.erp_qualidade_inspecao_templates t
   where t.id = p_template_id and t.empresa_id = v_empresa
   for update;
  if not found then raise exception 'TEMPLATE_NAO_ENCONTRADO_NA_EMPRESA'; end if;
  if v_template.status <> 'RASCUNHO' then
    raise exception 'TEMPLATE_PUBLICADO_IMUTAVEL_CRIE_NOVA_REVISAO';
  end if;

  delete from public.erp_qualidade_inspecao_template_itens
   where empresa_id = v_empresa and template_id = p_template_id;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_ordem := v_ordem + 1;
    if coalesce(nullif(trim(v_item->>'codigo_item'), ''), '') = ''
       or coalesce(nullif(trim(v_item->>'caracteristica'), ''), '') = '' then
      raise exception 'ITEM_SEM_CODIGO_OU_CARACTERISTICA';
    end if;
    if coalesce(v_item->>'tipo_resposta', 'NUMERICO') not in
       ('NUMERICO', 'TEXTO', 'SIM_NAO', 'CONFORME_NAO_CONFORME') then
      raise exception 'TIPO_DE_RESPOSTA_INVALIDO';
    end if;

    insert into public.erp_qualidade_inspecao_template_itens (
      empresa_id, template_id, sequencia, codigo_item, caracteristica, metodo,
      unidade, valor_nominal, limite_inferior, limite_superior, tipo_resposta,
      criticidade, obrigatorio, instrucoes
    ) values (
      v_empresa, p_template_id, v_ordem,
      trim(v_item->>'codigo_item'),
      trim(v_item->>'caracteristica'),
      nullif(trim(v_item->>'metodo'), ''),
      nullif(trim(v_item->>'unidade'), ''),
      nullif(v_item->>'valor_nominal', '')::numeric,
      nullif(v_item->>'limite_inferior', '')::numeric,
      nullif(v_item->>'limite_superior', '')::numeric,
      coalesce(v_item->>'tipo_resposta', 'NUMERICO'),
      coalesce(v_item->>'criticidade', 'MEDIA'),
      coalesce((v_item->>'obrigatorio')::boolean, true),
      nullif(trim(v_item->>'instrucoes'), '')
    );
  end loop;

  update public.erp_qualidade_inspecao_templates
     set updated_at = now()
   where id = p_template_id and empresa_id = v_empresa;

  return v_ordem;
end;
$$;

create or replace function public.erp_qualidade_inspecao_template_publicar(p_template_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_nivel_admin integer;
  v_template public.erp_qualidade_inspecao_templates%rowtype;
begin
  select u.id, u.nivel_admin into v_usuario_id, v_nivel_admin
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa
     and u.ativo is true and u.deleted_at is null
   limit 1;
  if v_empresa is null or v_usuario_id is null or coalesce(v_nivel_admin, 0) < 8 then
    raise exception 'NIVEL_ADMIN_INSUFICIENTE_PARA_PUBLICAR_TEMPLATE';
  end if;

  select t.* into v_template
    from public.erp_qualidade_inspecao_templates t
   where t.id = p_template_id and t.empresa_id = v_empresa
   for update;
  if not found then raise exception 'TEMPLATE_NAO_ENCONTRADO_NA_EMPRESA'; end if;
  if v_template.status <> 'RASCUNHO' then
    raise exception 'SOMENTE_RASCUNHO_PODE_SER_PUBLICADO';
  end if;
  if not exists (
    select 1 from public.erp_qualidade_inspecao_template_itens i
     where i.empresa_id = v_empresa and i.template_id = p_template_id
  ) then
    raise exception 'TEMPLATE_PRECISA_DE_AO_MENOS_UM_ITEM';
  end if;

  update public.erp_qualidade_inspecao_templates
     set status = 'OBSOLETO',
         vigencia_fim = current_date - 1,
         updated_at = now()
   where empresa_id = v_empresa
     and codigo = v_template.codigo
     and produto_id is not distinct from v_template.produto_id
     and operacao = v_template.operacao
     and status = 'VIGENTE'
     and id <> p_template_id;

  update public.erp_qualidade_inspecao_templates
     set status = 'VIGENTE',
         vigencia_inicio = current_date,
         vigencia_fim = null,
         aprovado_por = v_usuario_id,
         aprovado_em = now(),
         updated_at = now()
   where id = p_template_id and empresa_id = v_empresa;

  return p_template_id;
end;
$$;

create or replace function public.erp_inspecao_exigir_template_versionado()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_template public.erp_qualidade_inspecao_templates%rowtype;
begin
  if new.tipo = 'PROCESSO_METROLOGIA' then
    if new.template_id is null or new.template_revisao is null or new.template_snapshot is null then
      raise exception 'INSPECAO_PROCESSO_EXIGE_TEMPLATE_VERSIONADO';
    end if;
    if jsonb_typeof(new.template_snapshot->'itens') is distinct from 'array'
       or jsonb_array_length(new.template_snapshot->'itens') = 0 then
      raise exception 'SNAPSHOT_DO_TEMPLATE_SEM_ITENS';
    end if;

    select t.* into v_template
      from public.erp_qualidade_inspecao_templates t
     where t.id = new.template_id
       and t.empresa_id = new.empresa_id
       and t.revisao = new.template_revisao
       and t.status = 'VIGENTE'
       and t.vigencia_inicio <= current_date
       and (t.vigencia_fim is null or t.vigencia_fim >= current_date);
    if not found then
      raise exception 'TEMPLATE_NAO_VIGENTE_OU_REVISAO_DIVERGENTE';
    end if;
    if v_template.produto_id is not null and v_template.produto_id <> new.produto_id then
      raise exception 'TEMPLATE_NAO_PERTENCE_AO_PRODUTO_DA_INSPECAO';
    end if;
    if v_template.operacao <> 'PROCESSO_METROLOGIA' then
      raise exception 'TEMPLATE_NAO_PERTENCE_A_OPERACAO_DA_INSPECAO';
    end if;
    if new.template_snapshot->>'codigo' is distinct from v_template.codigo
       or new.template_snapshot->>'revisao' is distinct from v_template.revisao::text then
      raise exception 'SNAPSHOT_DIVERGE_DA_REVISAO_DO_TEMPLATE';
    end if;
    if jsonb_typeof(new.medicoes) is distinct from 'array'
       or jsonb_array_length(new.medicoes) <> (
         select count(*) from public.erp_qualidade_inspecao_template_itens i
          where i.empresa_id = new.empresa_id and i.template_id = new.template_id
       ) then
      raise exception 'RESULTADOS_NAO_CORRESPONDEM_AOS_ITENS_DO_TEMPLATE';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_erp_inspecao_exigir_template_versionado on public.erp_inspecoes;
create trigger trg_erp_inspecao_exigir_template_versionado
before insert or update of tipo, template_id, template_revisao, template_snapshot, medicoes
on public.erp_inspecoes
for each row execute function public.erp_inspecao_exigir_template_versionado();

revoke all on function public.erp_qualidade_inspecao_template_nova_revisao(uuid) from public, anon;
revoke all on function public.erp_qualidade_inspecao_template_salvar_itens(uuid, jsonb) from public, anon;
revoke all on function public.erp_qualidade_inspecao_template_publicar(uuid) from public, anon;
grant execute on function public.erp_qualidade_inspecao_template_nova_revisao(uuid) to authenticated;
grant execute on function public.erp_qualidade_inspecao_template_salvar_itens(uuid, jsonb) to authenticated;
grant execute on function public.erp_qualidade_inspecao_template_publicar(uuid) to authenticated;

commit;
