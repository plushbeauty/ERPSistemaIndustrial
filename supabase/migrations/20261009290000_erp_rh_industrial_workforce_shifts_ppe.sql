-- RH Industrial: tenant-isolated employees, shifts, PPE master and deliveries.
begin;

create table if not exists public.erp_rh_funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  matricula text not null,
  nome_completo text not null,
  cpf text not null,
  rg text,
  data_admissao date not null,
  cargo_funcao text not null,
  departamento text not null check (departamento in ('ENGENHARIA','PCP','PRODUCAO','QUALIDADE','ALMOXARIFADO','MANUTENCAO','FISCAL','ADMINISTRATIVO','OUTRO')),
  custo_hora_mod numeric(14,4) not null default 0 check (custo_hora_mod >= 0),
  status text not null default 'ATIVO' check (status in ('ATIVO','AFASTADO','DESLIGADO')),
  observacoes text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, matricula),
  unique (empresa_id, cpf),
  check (length(btrim(matricula)) > 0),
  check (length(btrim(nome_completo)) >= 3),
  check (cpf ~ '^[0-9]{11}$')
);

create table if not exists public.erp_rh_turnos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo text not null,
  nome text not null,
  hora_inicio time not null,
  hora_fim time not null,
  intervalo_minutos integer not null default 0 check (intervalo_minutos between 0 and 720),
  escala text not null check (escala in ('5X2','6X2','12X36','6X1','PERSONALIZADA')),
  carga_mensal_horas numeric(7,2) not null check (carga_mensal_horas > 0 and carga_mensal_horas <= 300),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, codigo),
  check (length(btrim(nome)) >= 2),
  check (hora_fim <> hora_inicio)
);

create table if not exists public.erp_rh_funcionario_turnos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  funcionario_id uuid not null,
  turno_id uuid not null,
  vigencia_inicio date not null default current_date,
  vigencia_fim date,
  observacao text,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (empresa_id, id),
  foreign key (empresa_id, funcionario_id) references public.erp_rh_funcionarios(empresa_id,id) on delete restrict,
  foreign key (empresa_id, turno_id) references public.erp_rh_turnos(empresa_id,id) on delete restrict,
  check (vigencia_fim is null or vigencia_fim >= vigencia_inicio)
);
create unique index if not exists idx_erp_rh_funcionario_turno_vigente
  on public.erp_rh_funcionario_turnos(empresa_id, funcionario_id)
  where vigencia_fim is null;

create table if not exists public.erp_rh_epis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo text not null,
  nome text not null,
  ca_numero text not null,
  ca_validade date not null,
  periodicidade_troca_dias integer not null check (periodicidade_troca_dias > 0 and periodicidade_troca_dias <= 3650),
  funcoes_aplicaveis text[] not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_id, id),
  unique (empresa_id, codigo),
  check (length(btrim(nome)) >= 2),
  check (length(btrim(ca_numero)) > 0)
);

create table if not exists public.erp_rh_entregas_epi (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  funcionario_id uuid not null,
  epi_id uuid not null,
  quantidade integer not null check (quantidade > 0),
  entregue_em date not null default current_date,
  proxima_troca_em date not null,
  confirmado_recebimento boolean not null default false,
  assinatura_storage_path text,
  responsavel_id uuid references auth.users(id) on delete set null,
  observacao text,
  criado_em timestamptz not null default now(),
  unique (empresa_id, id),
  foreign key (empresa_id, funcionario_id) references public.erp_rh_funcionarios(empresa_id,id) on delete restrict,
  foreign key (empresa_id, epi_id) references public.erp_rh_epis(empresa_id,id) on delete restrict,
  check (proxima_troca_em >= entregue_em),
  check (assinatura_storage_path is null or assinatura_storage_path like empresa_id::text || '/rh/epis/%')
);

create index if not exists idx_erp_rh_funcionarios_status
  on public.erp_rh_funcionarios(empresa_id,status,departamento,nome_completo);
create index if not exists idx_erp_rh_turnos_ativos
  on public.erp_rh_turnos(empresa_id,ativo,codigo);
create index if not exists idx_erp_rh_epi_ca_validade
  on public.erp_rh_epis(empresa_id,ca_validade,ativo);
create index if not exists idx_erp_rh_entregas_troca
  on public.erp_rh_entregas_epi(empresa_id,proxima_troca_em);

do $$
declare t text;
begin
  foreach t in array array['erp_rh_funcionarios','erp_rh_turnos','erp_rh_funcionario_turnos','erp_rh_epis','erp_rh_entregas_epi'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (empresa_id = public.erp_current_empresa_id() or coalesce(public.erp_is_master(), false))', t || '_tenant_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((empresa_id = public.erp_current_empresa_id() or coalesce(public.erp_is_master(), false)) and (coalesce(public.erp_is_master(), false) or coalesce(public.erp_has_permission(''rh'',''criar''), false)))', t || '_tenant_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant_update', t);
    execute format('create policy %I on public.%I for update to authenticated using ((empresa_id = public.erp_current_empresa_id() or coalesce(public.erp_is_master(), false)) and (coalesce(public.erp_is_master(), false) or coalesce(public.erp_has_permission(''rh'',''editar''), false))) with check ((empresa_id = public.erp_current_empresa_id() or coalesce(public.erp_is_master(), false)) and (coalesce(public.erp_is_master(), false) or coalesce(public.erp_has_permission(''rh'',''editar''), false)))', t || '_tenant_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_tenant_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((empresa_id = public.erp_current_empresa_id() or coalesce(public.erp_is_master(), false)) and (coalesce(public.erp_is_master(), false) or coalesce(public.erp_has_permission(''rh'',''excluir''), false)))', t || '_tenant_delete', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

commit;
