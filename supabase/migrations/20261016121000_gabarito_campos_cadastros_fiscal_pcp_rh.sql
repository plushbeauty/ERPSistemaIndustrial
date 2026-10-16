-- @AUDIT_DATE: 2026-10-16
-- @AUDIT_TIME_BRT: 12:44
-- @AUDIT_REVISION: #AUDIT-ERP-20261016-11
-- @STATUS: IMPLEMENTED_PENDING_VALIDATION
-- @SCOPE: supabase/migrations/20261016121000_gabarito_campos_cadastros_fiscal_pcp_rh.sql
-- @REVIEWED: Alterações aditivas em Clientes, Fornecedores, Fiscal, PCP/MES e RH/ASO e vínculos de tenant.
-- @CHANGES: Registro de auditoria da migration existente; não confirma aplicação no Supabase remoto. Validar constraints, tabelas-base e RLS antes de considerar disponível em produção.
-- @VALIDATION: Arquivo inspecionado no GitHub; type-check/lint/build e validação remota não executados nesta operação.
-- @CHECKLIST: Tenant-Scope | Preserve-Business-Rules | No-Fake-Data | Validation-Required

-- Cadastro de campos do gabarito industrial (aditivo e idempotente).
-- Preserva os cadastros e regras existentes; não cria tabelas duplicadas para clientes,
-- fornecedores, regras fiscais, OPs ou apontamentos já usados pelo ERP.
-- A migration só altera estrutura. Não popula alíquotas fiscais presumidas nem dados médicos fictícios.

-- 1.1 Clientes: complementa a ficha já existente em erp_clientes.
alter table public.erp_clientes
  add column if not exists tipo_pessoa text,
  add column if not exists inscricao_estadual text,
  add column if not exists cep text,
  add column if not exists cidade text,
  add column if not exists uf varchar(2);

-- 1.2 Fornecedores e transportadoras: reutiliza o cadastro único de fornecedores.
alter table public.erp_fornecedores
  add column if not exists condicao_pagamento_padrao text,
  add column if not exists eh_transportadora boolean not null default false;

-- 2.1 / 2.2 Reutiliza a matriz fiscal existente. Não cria uma segunda tabela de impostos.
alter table public.erp_regras_fiscais
  add column if not exists cst_ipi text,
  add column if not exists pis_cst text,
  add column if not exists cofins_cst text,
  add column if not exists tipo_operacao text not null default 'AMBAS';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_regras_fiscais_tipo_operacao_chk'
      and conrelid = 'public.erp_regras_fiscais'::regclass
  ) then
    alter table public.erp_regras_fiscais
      add constraint erp_regras_fiscais_tipo_operacao_chk
      check (tipo_operacao in ('ENTRADA','SAIDA','AMBAS')) not valid;
  end if;
end
$$;

-- 3.1 OP: vincula o almoxarifado de destino respeitando a empresa (tenant).
create unique index if not exists erp_almoxarifados_empresa_id_id_uq
  on public.erp_almoxarifados (empresa_id, id);

alter table public.erp_ordens_producao
  add column if not exists almoxarifado_destino_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_op_almoxarifado_destino_tenant_fk'
      and conrelid = 'public.erp_ordens_producao'::regclass
  ) then
    alter table public.erp_ordens_producao
      add constraint erp_op_almoxarifado_destino_tenant_fk
      foreign key (empresa_id, almoxarifado_destino_id)
      references public.erp_almoxarifados (empresa_id, id)
      not valid;
  end if;
end
$$;

create index if not exists idx_erp_op_almoxarifado_destino
  on public.erp_ordens_producao (empresa_id, almoxarifado_destino_id);

-- 3.2 Catálogo de motivos de refugo por empresa; o apontamento guarda o código selecionado.
create table if not exists public.erp_motivos_refugo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo varchar(4) not null,
  descricao text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_motivos_refugo_empresa_codigo_uq unique (empresa_id, codigo)
);

alter table public.erp_apontamentos_processo
  add column if not exists motivo_refugo_codigo varchar(4),
  add column if not exists motivo_refugo_descricao text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_apontamento_motivo_refugo_tenant_fk'
      and conrelid = 'public.erp_apontamentos_processo'::regclass
  ) then
    alter table public.erp_apontamentos_processo
      add constraint erp_apontamento_motivo_refugo_tenant_fk
      foreign key (empresa_id, motivo_refugo_codigo)
      references public.erp_motivos_refugo (empresa_id, codigo)
      not valid;
  end if;
end
$$;

create index if not exists idx_erp_motivos_refugo_empresa_ativo
  on public.erp_motivos_refugo (empresa_id, ativo, codigo);

alter table public.erp_motivos_refugo enable row level security;
drop policy if exists erp_motivos_refugo_tenant on public.erp_motivos_refugo;
create policy erp_motivos_refugo_tenant on public.erp_motivos_refugo
  for all to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id())
  with check (public.erp_is_master() or empresa_id = public.erp_current_empresa_id());
grant select, insert, update, delete on public.erp_motivos_refugo to authenticated;

-- 4.1 ASO: registro ocupacional separado de documentos genéricos de RH.
-- O vínculo composto impede associar funcionário de outra empresa.
create unique index if not exists erp_funcionarios_empresa_id_id_uq
  on public.erp_funcionarios (empresa_id, id);

create table if not exists public.erp_exames_ocupacionais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  funcionario_id uuid not null,
  tipo_exame text not null
    check (tipo_exame in ('ADMISSIONAL','PERIODICO','DEMISSIONAL','RETORNO_TRABALHO','MUDANCA_RISCO','OUTRO')),
  data_exame date not null,
  resultado text not null default 'AGUARDANDO'
    check (resultado in ('APTO','INAPTO','APTO_RESTRICOES','AGUARDANDO')),
  crm_medico varchar(20) not null,
  medico_nome text,
  data_validade date,
  documento_storage_path text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  constraint erp_exames_ocupacionais_funcionario_tenant_fk
    foreign key (empresa_id, funcionario_id)
    references public.erp_funcionarios (empresa_id, id),
  constraint erp_exames_ocupacionais_validade_chk
    check (data_validade is null or data_validade >= data_exame)
);

create index if not exists idx_erp_exames_ocupacionais_empresa_funcionario_data
  on public.erp_exames_ocupacionais (empresa_id, funcionario_id, data_exame desc);

alter table public.erp_exames_ocupacionais enable row level security;
drop policy if exists erp_exames_ocupacionais_tenant on public.erp_exames_ocupacionais;
create policy erp_exames_ocupacionais_tenant on public.erp_exames_ocupacionais
  for all to authenticated
  using (public.erp_is_master() or empresa_id = public.erp_current_empresa_id())
  with check (public.erp_is_master() or empresa_id = public.erp_current_empresa_id());
grant select, insert, update, delete on public.erp_exames_ocupacionais to authenticated;

-- Índice fiscal de pesquisa preserva a matriz já usada pelo módulo Fiscal.
create index if not exists idx_erp_regras_fiscais_empresa_operacao
  on public.erp_regras_fiscais (empresa_id, tipo_operacao, ncm, cfop, ativo);
