-- Compras: respostas de cotação e campos comerciais complementares.
alter table public.erp_rfq_fornecedores
  add column if not exists valor_total numeric(18,2),
  add column if not exists valor_frete numeric(18,2) not null default 0,
  add column if not exists valor_desconto numeric(18,2) not null default 0,
  add column if not exists prazo_entrega_dias integer,
  add column if not exists condicao_pagamento text,
  add column if not exists validade_proposta date,
  add column if not exists observacoes_resposta text;

alter table public.erp_pedidos_compra
  add column if not exists valor_frete numeric(18,2) not null default 0,
  add column if not exists valor_desconto numeric(18,2) not null default 0,
  add column if not exists transportadora text,
  add column if not exists modalidade_frete text,
  add column if not exists numero_contrato text,
  add column if not exists observacoes_recebimento text;

create index if not exists idx_erp_rfq_fornecedores_status
  on public.erp_rfq_fornecedores(empresa_id,rfq_id,status);

create index if not exists idx_erp_pedidos_compra_empresa_transportadora
  on public.erp_pedidos_compra(empresa_id,transportadora);

-- Campos financeiros/comerciais não podem assumir valores negativos.
do $$ begin
  alter table public.erp_rfq_fornecedores
    add constraint erp_rfq_fornecedores_valores_chk
    check (coalesce(valor_total,0) >= 0 and coalesce(valor_frete,0) >= 0 and coalesce(valor_desconto,0) >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.erp_pedidos_compra
    add constraint erp_pedidos_compra_valores_comerciais_chk
    check (coalesce(valor_frete,0) >= 0 and coalesce(valor_desconto,0) >= 0);
exception when duplicate_object then null; end $$;
