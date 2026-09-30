/*
 ERP INDUSTRIAL — Vendas & Comercial: tabelas de preço completas
 Base funcional: referência do produto + SAP Business One + Odoo + ERPNext.
 Não altera tabelas existentes destrutivamente; apenas adiciona regras comerciais versionáveis.
*/
alter table public.erp_tabelas_preco
  add column if not exists moeda varchar(3) not null default 'BRL',
  add column if not exists condicao_pagamento text,
  add column if not exists desconto_maximo_vendedor numeric(8,3) not null default 0,
  add column if not exists desconto_maximo_gerente numeric(8,3) not null default 0;

alter table public.erp_tabelas_preco
  drop constraint if exists erp_tabelas_preco_moeda_ck,
  drop constraint if exists erp_tabelas_preco_descontos_ck,
  drop constraint if exists erp_tabelas_preco_validade_ck;

alter table public.erp_tabelas_preco
  add constraint erp_tabelas_preco_moeda_ck check (char_length(moeda)=3),
  add constraint erp_tabelas_preco_descontos_ck check (
    desconto_maximo_vendedor between 0 and 100
    and desconto_maximo_gerente between 0 and 100
  ),
  add constraint erp_tabelas_preco_validade_ck check (
    validade_fim is null or validade_inicio is null or validade_fim >= validade_inicio
  );

create table if not exists public.erp_tabelas_preco_regras_volume (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  tabela_preco_id uuid not null references public.erp_tabelas_preco(id) on delete cascade,
  produto_id uuid references public.erp_produtos(id) on delete cascade,
  quantidade_minima numeric(14,3) not null,
  quantidade_maxima numeric(14,3),
  desconto_percentual numeric(8,3) not null default 0,
  validade_inicio date,
  validade_fim date,
  prioridade integer not null default 100,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_tprv_qty_ck check (quantidade_minima > 0 and (quantidade_maxima is null or quantidade_maxima >= quantidade_minima)),
  constraint erp_tprv_discount_ck check (desconto_percentual between 0 and 100),
  constraint erp_tprv_validity_ck check (validade_fim is null or validade_inicio is null or validade_fim >= validade_inicio)
);

create index if not exists idx_erp_tprv_empresa_tabela on public.erp_tabelas_preco_regras_volume(empresa_id,tabela_preco_id,prioridade);
create index if not exists idx_erp_tprv_produto on public.erp_tabelas_preco_regras_volume(empresa_id,produto_id);
alter table public.erp_tabelas_preco_regras_volume enable row level security;
drop policy if exists erp_tprv_select on public.erp_tabelas_preco_regras_volume;
drop policy if exists erp_tprv_insert on public.erp_tabelas_preco_regras_volume;
drop policy if exists erp_tprv_update on public.erp_tabelas_preco_regras_volume;
drop policy if exists erp_tprv_delete on public.erp_tabelas_preco_regras_volume;
create policy erp_tprv_select on public.erp_tabelas_preco_regras_volume for select to authenticated
  using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_tprv_insert on public.erp_tabelas_preco_regras_volume for insert to authenticated
  with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_tprv_update on public.erp_tabelas_preco_regras_volume for update to authenticated
  using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_tprv_delete on public.erp_tabelas_preco_regras_volume for delete to authenticated
  using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select,insert,update,delete on public.erp_tabelas_preco_regras_volume to authenticated;
