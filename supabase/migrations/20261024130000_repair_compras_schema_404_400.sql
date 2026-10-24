-- SYSNQRA ERP INDUSTRIAL — recuperação idempotente do schema de Compras.
-- Corrige tabelas ausentes (404) e colunas consultadas pela aplicação (400).
-- Não apaga nem recria dados existentes; mantém RLS por empresa.

create table if not exists public.erp_requisicoes_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  codigo text not null,
  ordem_producao_id uuid null references public.erp_ordens_producao(id),
  data_limite date null,
  comprador_nome text null,
  status text not null default 'AGUARDANDO_COTACAO',
  centro_custo varchar(50) null,
  nivel_urgencia varchar(20) not null default 'MEDIA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_requisicoes_compra_empresa_codigo_uk unique (empresa_id, codigo),
  constraint erp_requisicoes_compra_nivel_urgencia_chk
    check (nivel_urgencia in ('BAIXA','MEDIA','ALTA','CRITICA'))
);

create table if not exists public.erp_requisicoes_compra_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  requisicao_id uuid not null references public.erp_requisicoes_compra(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id),
  quantidade numeric(14,3) not null default 0 check (quantidade > 0),
  fornecedor_id uuid null references public.erp_fornecedores(id),
  status text not null default 'AGUARDANDO_COTACAO',
  created_at timestamptz not null default now()
);

alter table public.erp_requisicoes_compra
  add column if not exists centro_custo varchar(50),
  add column if not exists nivel_urgencia varchar(20) not null default 'MEDIA',
  add column if not exists updated_at timestamptz not null default now();

alter table public.erp_rfq
  add column if not exists fornecedor_escolhido_id uuid null references public.erp_fornecedores(id),
  add column if not exists menor_preco_ofertado numeric(18,2),
  add column if not exists justificativa_escolha text,
  add column if not exists status_aprovacao text not null default 'EM_ANALISE',
  add column if not exists comprador_responsavel varchar(100),
  add column if not exists termo_condicao_geral text,
  add column if not exists data_limite date,
  add column if not exists previsao_entrega date,
  add column if not exists data_conclusao date,
  add column if not exists menor_custo_liquido_atendido boolean not null default false;

alter table public.erp_pedidos_compra
  add column if not exists comprador_nome text,
  add column if not exists condicao_pagamento text,
  add column if not exists prazo_entrega date,
  add column if not exists status text not null default 'RASCUNHO',
  add column if not exists data_pedido timestamptz not null default now(),
  add column if not exists total numeric(18,2) not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_erp_requisicoes_compra_empresa_created
  on public.erp_requisicoes_compra (empresa_id, created_at desc);
create index if not exists idx_erp_requisicoes_compra_empresa_urgencia_status
  on public.erp_requisicoes_compra (empresa_id, nivel_urgencia, status, created_at desc);
create index if not exists idx_erp_requisicoes_compra_itens_empresa_created
  on public.erp_requisicoes_compra_itens (empresa_id, created_at desc);
create index if not exists idx_erp_rfq_empresa_status_aprovacao
  on public.erp_rfq (empresa_id, status_aprovacao, created_at desc);
create index if not exists idx_erp_pedidos_compra_empresa_created
  on public.erp_pedidos_compra (empresa_id, created_at desc);

alter table public.erp_requisicoes_compra enable row level security;
alter table public.erp_requisicoes_compra_itens enable row level security;

drop policy if exists erp_requisicoes_compra_select on public.erp_requisicoes_compra;
drop policy if exists erp_requisicoes_compra_insert on public.erp_requisicoes_compra;
drop policy if exists erp_requisicoes_compra_update on public.erp_requisicoes_compra;
drop policy if exists erp_requisicoes_compra_delete on public.erp_requisicoes_compra;
drop policy if exists erp_requisicoes_compra_tenant on public.erp_requisicoes_compra;
create policy erp_requisicoes_compra_tenant
  on public.erp_requisicoes_compra for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_requisicoes_compra_itens_select on public.erp_requisicoes_compra_itens;
drop policy if exists erp_requisicoes_compra_itens_insert on public.erp_requisicoes_compra_itens;
drop policy if exists erp_requisicoes_compra_itens_update on public.erp_requisicoes_compra_itens;
drop policy if exists erp_requisicoes_compra_itens_delete on public.erp_requisicoes_compra_itens;
drop policy if exists erp_requisicoes_compra_itens_tenant on public.erp_requisicoes_compra_itens;
create policy erp_requisicoes_compra_itens_tenant
  on public.erp_requisicoes_compra_itens for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

grant select, insert, update, delete on public.erp_requisicoes_compra,
  public.erp_requisicoes_compra_itens, public.erp_rfq, public.erp_pedidos_compra to authenticated;

-- Solicita ao PostgREST atualizar seu cache de schema após a migration ser aplicada.
notify pgrst, 'reload schema';
