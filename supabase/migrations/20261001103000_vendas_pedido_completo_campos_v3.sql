/*
  VENDAS — Pedido completo v3
  Campos comerciais adicionais e fluxo Pedido -> Reserva -> PCP.
  Reserva não reduz estoque físico; somente disponibilidade.
*/
alter table public.erp_pedidos_venda
  add column if not exists data_entrada date not null default current_date,
  add column if not exists condicao_pagamento text,
  add column if not exists vendedor_nome text,
  add column if not exists modalidade_frete text,
  add column if not exists transportadora text,
  add column if not exists subtotal numeric(18,2) not null default 0,
  add column if not exists desconto_valor numeric(18,2) not null default 0,
  add column if not exists valor_frete numeric(18,2) not null default 0,
  add column if not exists valor_outras_despesas numeric(18,2) not null default 0;

create index if not exists idx_erp_pedidos_venda_empresa_data_entrada
  on public.erp_pedidos_venda(empresa_id,data_entrada desc);

/* A definição da função é mantida no migration anterior/runtime para permitir evolução controlada. */
