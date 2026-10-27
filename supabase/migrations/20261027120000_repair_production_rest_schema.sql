-- SYSNQRA ERP INDUSTRIAL
-- Reconciliacao idempotente do schema para os erros REST observados em producao.
-- Nao cria dados de exemplo e preserva isolamento por empresa.
-- Revisao: REST-SCHEMA-REPAIR-001 | 2026-10-27

-- Campos consultados pelo emissor fiscal e pela validacao fiscal de compras.
alter table public.erp_empresas
  add column if not exists inscricao_estadual text,
  add column if not exists razao_social text,
  add column if not exists nome_fantasia text,
  add column if not exists cnpj text,
  add column if not exists endereco text,
  add column if not exists cidade text,
  add column if not exists uf text,
  add column if not exists cep text,
  add column if not exists telefone text,
  add column if not exists email text;

alter table public.erp_pedidos_compra
  add column if not exists fiscal_status text not null default 'NAO_ANALISADO',
  add column if not exists fiscal_parecer text,
  add column if not exists comprador_nome text,
  add column if not exists condicao_pagamento text,
  add column if not exists prazo_entrega date;

-- Campos usados pelo relatorio do Bloco K. data_inicio/data_fim podem ja existir.
alter table public.erp_ordens_producao
  add column if not exists numero_op text,
  add column if not exists numero text,
  add column if not exists quantidade_produzida numeric(18,6) not null default 0,
  add column if not exists data_inicio timestamptz,
  add column if not exists data_fim timestamptz;

-- Campos de compatibilidade consumidos pela tela de RFQ/Análise de Preços.
alter table public.erp_rfq
  add column if not exists fornecedor_escolhido_id uuid,
  add column if not exists justificativa_escolha text,
  add column if not exists status_aprovacao text not null default 'EM_ANALISE',
  add column if not exists menor_preco_ofertado numeric(18,4),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

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
create table if not exists public.erp_engenharia_bom_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  bom_id uuid not null references public.erp_engenharia_bom(id) on delete cascade,
  componente_id uuid not null references public.erp_produtos(id),
  quantidade_gasto numeric(18,6) not null check (quantidade_gasto > 0),
  perda_pct numeric(8,4) not null default 0 check (perda_pct >= 0 and perda_pct <= 100),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  constraint erp_engenharia_bom_item_uk unique (bom_id, componente_id)
);
create index if not exists erp_engenharia_bom_empresa_produto_idx
  on public.erp_engenharia_bom(empresa_id, produto_pai_id, versao desc);
create index if not exists erp_engenharia_bom_itens_empresa_bom_idx
  on public.erp_engenharia_bom_itens(empresa_id, bom_id);
alter table public.erp_engenharia_bom enable row level security;
drop policy if exists erp_engenharia_bom_select_tenant on public.erp_engenharia_bom;
create policy erp_engenharia_bom_select_tenant on public.erp_engenharia_bom
  for select to authenticated
  using (empresa_id = (select public.erp_current_empresa_id()));
drop policy if exists erp_engenharia_bom_itens_select_tenant on public.erp_engenharia_bom_itens;
create policy erp_engenharia_bom_itens_select_tenant on public.erp_engenharia_bom_itens
  for select to authenticated
  using (empresa_id = (select public.erp_current_empresa_id()));
grant select on public.erp_engenharia_bom, public.erp_engenharia_bom_itens to authenticated;

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

-- RPC consumida pelo Portal do Cliente. Restringe os pedidos ao vínculo ativo
-- do usuário autenticado, sem confiar em empresa_id enviado pelo navegador.
create or replace function public.erp_portal_cliente_pedidos()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_access public.erp_portal_acessos%rowtype;
  v_result jsonb;
begin
  select * into v_access
  from public.erp_portal_acessos
  where auth_user_id=auth.uid() and tipo_portal='CLIENTE' and ativo=true
  limit 1;
  if not found then raise exception 'PORTAL_CLIENTE_SEM_ACESSO'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'numero',p.numero,
    'pedido_cliente',p.pedido_cliente,
    'status',p.status,
    'data_entrega_prometida',p.data_entrega_prometida,
    'total',p.total,
    'itens',(select coalesce(jsonb_agg(jsonb_build_object(
      'descricao',i.descricao,
      'quantidade',i.quantidade,
      'data_fabricacao',i.data_fabricacao
    )),'[]'::jsonb)
    from public.erp_pedidos_venda_itens i
    where i.empresa_id=p.empresa_id and i.pedido_id=p.id)
  ) order by p.created_at desc),'[]'::jsonb)
  into v_result
  from public.erp_pedidos_venda p
  where p.empresa_id=v_access.empresa_id and p.cliente_id=v_access.cliente_id;
  return v_result;
end;
$$;
revoke all on function public.erp_portal_cliente_pedidos() from public,anon;
grant execute on function public.erp_portal_cliente_pedidos() to authenticated;

-- Atualiza o cache de schema do PostgREST após a migração.
notify pgrst, 'reload schema';
