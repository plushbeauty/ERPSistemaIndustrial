-- SYSNQRA ERP INDUSTRIAL
-- Autor: Fernando Schuinsekel
-- Revisão: REV-CONTRATO-BANCO-20261103-02
--
-- Reconciliação idempotente das tabelas que as telas consultam e que nenhuma migration
-- deste repositório cria (verificado: nenhuma menção de DDL fora de corpo de função).
-- create table if not exists + add column if not exists: se a tabela já existir no banco
-- vivo, este arquivo não destrói nada e apenas acrescenta as colunas que faltarem.
-- Não insere dados de exemplo. Não toca em tabelas que já possuem versão real no schema
-- (paradas, refugos, treinamentos e auditorias têm tabelas próprias e as telas foram
-- reapontadas para elas no mesmo incremento de código).

-- ── 1. Almoxarifados (BalancoEstoque, EstoqueAlmoxarifadoCompact) ─────────────
create table if not exists public.erp_almoxarifados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  codigo text not null,
  nome text not null,
  tipo text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_almoxarifados_codigo_uq unique (empresa_id, codigo)
);
alter table public.erp_almoxarifados
  add column if not exists tipo text,
  add column if not exists ativo boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_erp_almoxarifados_empresa_ativo
  on public.erp_almoxarifados (empresa_id, ativo, codigo);

-- ── 2. Contas a pagar (CentraisIndustriais financeiro, Fiscal) ────────────────
create table if not exists public.erp_contas_pagar (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  descricao text not null,
  documento text,
  valor numeric(14,2) not null default 0,
  vencimento date,
  pagamento date,
  status text not null default 'aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_contas_pagar
  add column if not exists documento text,
  add column if not exists pagamento date,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_erp_contas_pagar_empresa_vencimento
  on public.erp_contas_pagar (empresa_id, vencimento, status);

-- ── 3. Contas a receber (Fiscal) ─────────────────────────────────────────────
create table if not exists public.erp_contas_receber (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  descricao text not null,
  documento text,
  valor numeric(14,2) not null default 0,
  vencimento date,
  recebimento date,
  status text not null default 'aberta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_contas_receber
  add column if not exists documento text,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_erp_contas_receber_empresa_vencimento
  on public.erp_contas_receber (empresa_id, vencimento, status);

-- ── 4. Lançamentos financeiros (FiscalPrevisaoCaixa, IndustrialModuleWorkspace) ─
create table if not exists public.erp_financeiro_lancamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  tipo text not null default 'despesa',
  categoria text,
  descricao text not null,
  valor numeric(14,2) not null default 0,
  vencimento date,
  status text not null default 'aberto',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_financeiro_lancamentos
  add column if not exists categoria text,
  add column if not exists vencimento date,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_erp_financeiro_lancamentos_empresa_vencimento
  on public.erp_financeiro_lancamentos (empresa_id, vencimento, status);

-- ── 5. Revisões de BOM (EngenhariaRevisoesBOM) ───────────────────────────────
create table if not exists public.erp_bom_revisoes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete cascade,
  versao text not null,
  engenheiro text,
  motivo text,
  created_at timestamptz not null default now()
);
alter table public.erp_bom_revisoes
  add column if not exists engenheiro text,
  add column if not exists motivo text;
create index if not exists idx_erp_bom_revisoes_produto_data
  on public.erp_bom_revisoes (empresa_id, produto_id, created_at desc);

-- ── 6. Planos de inspeção (FichaEngenharia, QualidadeInspecaoProcesso) ───────
create table if not exists public.erp_planos_inspecao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  produto_id uuid references public.erp_produtos(id) on delete cascade,
  codigo text not null,
  caracteristica text not null,
  unidade text,
  limite_inferior numeric(18,6),
  limite_superior numeric(18,6),
  frequencia text not null default '100%',
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_planos_inspecao
  add column if not exists unidade text,
  add column if not exists limite_inferior numeric(18,6),
  add column if not exists limite_superior numeric(18,6),
  add column if not exists frequencia text not null default '100%',
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_erp_planos_inspecao_empresa_produto
  on public.erp_planos_inspecao (empresa_id, produto_id, codigo);

-- ── 7. Anexos de documentos e fotos (upload da máquina, molde, produto, SGQ) ──
create table if not exists public.erp_documentos_anexos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  entidade_tipo text not null,
  entidade_id uuid not null,
  nome_arquivo text not null,
  storage_path text,
  mime_type text,
  tamanho_bytes bigint,
  created_at timestamptz not null default now()
);
create index if not exists idx_erp_documentos_anexos_entidade
  on public.erp_documentos_anexos (empresa_id, entidade_tipo, entidade_id, created_at desc);

-- ── 8. Alertas do sistema (contadores do cabeçalho e do painel da diretoria) ──
-- Somente leitura no aplicativo: nenhuma tela insere aqui. A tabela existiu sempre
-- fora das migrations, então o hook de realtime recebia erro de relação inexistente.
create table if not exists public.erp_alertas_sistema (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id() references public.erp_empresas(id) on delete cascade,
  tipo_alerta text not null,
  status text not null default 'ATIVO',
  descricao text,
  created_at timestamptz not null default now()
);
create index if not exists idx_erp_alertas_sistema_empresa_status
  on public.erp_alertas_sistema (empresa_id, status, tipo_alerta);

-- ── RLS: isolamento por empresa em todas as tabelas acima ────────────────────
alter table public.erp_almoxarifados enable row level security;
alter table public.erp_contas_pagar enable row level security;
alter table public.erp_contas_receber enable row level security;
alter table public.erp_financeiro_lancamentos enable row level security;
alter table public.erp_bom_revisoes enable row level security;
alter table public.erp_planos_inspecao enable row level security;
alter table public.erp_documentos_anexos enable row level security;
alter table public.erp_alertas_sistema enable row level security;

drop policy if exists erp_almoxarifados_tenant on public.erp_almoxarifados;
create policy erp_almoxarifados_tenant on public.erp_almoxarifados
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_contas_pagar_tenant on public.erp_contas_pagar;
create policy erp_contas_pagar_tenant on public.erp_contas_pagar
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_contas_receber_tenant on public.erp_contas_receber;
create policy erp_contas_receber_tenant on public.erp_contas_receber
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_financeiro_lancamentos_tenant on public.erp_financeiro_lancamentos;
create policy erp_financeiro_lancamentos_tenant on public.erp_financeiro_lancamentos
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_bom_revisoes_tenant on public.erp_bom_revisoes;
create policy erp_bom_revisoes_tenant on public.erp_bom_revisoes
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_planos_inspecao_tenant on public.erp_planos_inspecao;
create policy erp_planos_inspecao_tenant on public.erp_planos_inspecao
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_documentos_anexos_tenant on public.erp_documentos_anexos;
create policy erp_documentos_anexos_tenant on public.erp_documentos_anexos
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_alertas_sistema_tenant on public.erp_alertas_sistema;
create policy erp_alertas_sistema_tenant on public.erp_alertas_sistema
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

notify pgrst, 'reload schema';
