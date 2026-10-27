-- SYSNQRA ERP INDUSTRIAL
-- Reconciliacao idempotente do schema para os erros REST observados em producao.
-- Nao cria dados de exemplo e preserva isolamento por empresa.
-- Revisao: REST-SCHEMA-REPAIR-001 | 2026-10-27

-- Campos consultados pelo emissor fiscal e pela validacao fiscal de compras.
alter table public.erp_empresas
  add column if not exists inscricao_estadual text;

alter table public.erp_pedidos_compra
  add column if not exists fiscal_status text not null default 'NAO_ANALISADO',
  add column if not exists fiscal_parecer text;

-- Campos usados pelo relatorio do Bloco K. data_inicio/data_fim podem ja existir.
alter table public.erp_ordens_producao
  add column if not exists numero_op text,
  add column if not exists quantidade_produzida numeric(18,6) not null default 0,
  add column if not exists data_inicio timestamptz,
  add column if not exists data_fim timestamptz;

-- CRM: tabela consultada pelo funil comercial.
create table if not exists public.erp_crm_oportunidades (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  cliente_id uuid references public.erp_clientes(id) on delete set null,
  titulo text not null,
  contato_nome text,
  contato_email text,
  contato_telefone text,
  etapa text not null default 'PROSPECCAO'
    check (etapa in ('PROSPECCAO','QUALIFICACAO','ORCAMENTO','NEGOCIACAO','GANHA','PERDIDA')),
  valor_estimado numeric(18,2) not null default 0 check (valor_estimado >= 0),
  probabilidade numeric(5,2) not null default 0 check (probabilidade between 0 and 100),
  fechamento_previsto date,
  proxima_acao text,
  proxima_acao_em date,
  observacoes text,
  responsavel_id uuid references public.erp_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists erp_crm_oportunidades_empresa_etapa_idx
  on public.erp_crm_oportunidades(empresa_id, etapa, updated_at desc);
alter table public.erp_crm_oportunidades enable row level security;
drop policy if exists erp_crm_oportunidades_tenant on public.erp_crm_oportunidades;
create policy erp_crm_oportunidades_tenant on public.erp_crm_oportunidades
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select, insert, update, delete on public.erp_crm_oportunidades to authenticated;

-- Engenharia: cabecalho da estrutura de produto (BOM).
create table if not exists public.erp_engenharia_bom (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  produto_pai_id uuid not null references public.erp_produtos(id),
  ferramenta_id uuid,
  versao integer not null check (versao > 0),
  observacoes text,
  status text not null default 'RASCUNHO'
    check (status in ('RASCUNHO','HOMOLOGADA','OBSOLETA')),
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_engenharia_bom_versao_uk unique (empresa_id, produto_pai_id, versao)
);
create index if not exists erp_engenharia_bom_empresa_produto_idx
  on public.erp_engenharia_bom(empresa_id, produto_pai_id, versao desc);
alter table public.erp_engenharia_bom enable row level security;
drop policy if exists erp_engenharia_bom_select_tenant on public.erp_engenharia_bom;
create policy erp_engenharia_bom_select_tenant on public.erp_engenharia_bom
  for select to authenticated
  using (empresa_id = (select public.erp_current_empresa_id()));
grant select on public.erp_engenharia_bom to authenticated;

-- Regras tributarias consumidas pela tela Fiscal / Impostos.
create table if not exists public.erp_regras_fiscais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  ncm text,
  cfop text,
  regime_empresa text,
  uf_destino text,
  icms_aliquota numeric(7,4) not null default 0,
  cst_csosn_icms text,
  ipi_aliquota numeric(7,4) not null default 0,
  cst_ipi text,
  pis_aliquota numeric(7,4) not null default 0,
  pis_cst text,
  cofins_aliquota numeric(7,4) not null default 0,
  cofins_cst text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.erp_regras_fiscais
  add column if not exists pis_cst text,
  add column if not exists cofins_cst text;
alter table public.erp_regras_fiscais enable row level security;
drop policy if exists erp_regras_fiscais_tenant on public.erp_regras_fiscais;
drop policy if exists "erp_regras_fiscais_tenant" on public.erp_regras_fiscais;
create policy erp_regras_fiscais_tenant on public.erp_regras_fiscais
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select, insert, update, delete on public.erp_regras_fiscais to authenticated;
create index if not exists idx_erp_regras_fiscais_busca
  on public.erp_regras_fiscais(empresa_id, ncm, cfop, uf_destino, ativo);

-- Bloco K: snapshots por periodo, com RLS por empresa.
create table if not exists public.erp_fiscal_bloco_k_estoque (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  periodo_referencia date not null,
  data_estoque date not null default current_date,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_estoque numeric(18,6) not null check (quantidade_estoque >= 0),
  indicador_propriedade char(1) not null default '0' check (indicador_propriedade in ('0','1','2')),
  created_at timestamptz not null default now(),
  unique (empresa_id, periodo_referencia, produto_id, indicador_propriedade)
);
create table if not exists public.erp_fiscal_bloco_k_producao (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  periodo_referencia date not null,
  ordem_producao_id uuid not null references public.erp_ordens_producao(id) on delete restrict,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_produzida numeric(18,6) not null check (quantidade_produzida >= 0),
  created_at timestamptz not null default now(),
  unique (empresa_id, periodo_referencia, ordem_producao_id)
);
alter table public.erp_fiscal_bloco_k_estoque enable row level security;
alter table public.erp_fiscal_bloco_k_producao enable row level security;
drop policy if exists erp_fiscal_bloco_k_estoque_tenant on public.erp_fiscal_bloco_k_estoque;
create policy erp_fiscal_bloco_k_estoque_tenant on public.erp_fiscal_bloco_k_estoque
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
drop policy if exists erp_fiscal_bloco_k_producao_tenant on public.erp_fiscal_bloco_k_producao;
create policy erp_fiscal_bloco_k_producao_tenant on public.erp_fiscal_bloco_k_producao
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());
grant select, insert, update, delete
  on public.erp_fiscal_bloco_k_estoque, public.erp_fiscal_bloco_k_producao
  to authenticated;
create index if not exists erp_bloco_k_estoque_periodo_idx
  on public.erp_fiscal_bloco_k_estoque(empresa_id, periodo_referencia);
create index if not exists erp_bloco_k_producao_periodo_idx
  on public.erp_fiscal_bloco_k_producao(empresa_id, periodo_referencia);

-- Atualiza o cache do PostgREST após aplicar a migracao.
notify pgrst, 'reload schema';
