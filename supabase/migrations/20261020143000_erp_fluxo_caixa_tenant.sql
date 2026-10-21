-- SYSNQRA ERP & SGQ INDUSTRIAL
-- Revisão: 2026-10-20 | Fluxo de caixa manual isolado por empresa.
-- As previsões de pedidos/RFQ não são copiadas automaticamente: precisam de regras
-- de faturamento/condição de pagamento aprovadas para não duplicar títulos.
create table if not exists public.erp_fluxo_caixa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id),
  descricao varchar(255) not null,
  tipo varchar(10) not null check (tipo in ('ENTRADA','SAIDA')),
  valor numeric(12,2) not null default 0 check (valor > 0),
  data_vencimento date not null,
  data_pagamento date,
  status varchar(20) not null default 'PENDENTE' check (status in ('PENDENTE','PAGO')),
  pedido_venda_id uuid null references public.erp_pedidos_venda(id) on delete set null,
  rfq_id uuid null references public.erp_rfq(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_erp_fluxo_caixa_empresa_vencimento
  on public.erp_fluxo_caixa (empresa_id, data_vencimento, status);

alter table public.erp_fluxo_caixa enable row level security;

drop policy if exists erp_fluxo_caixa_tenant on public.erp_fluxo_caixa;
create policy erp_fluxo_caixa_tenant
  on public.erp_fluxo_caixa
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.erp_is_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.erp_is_master());

grant select, insert, update, delete on public.erp_fluxo_caixa to authenticated;
