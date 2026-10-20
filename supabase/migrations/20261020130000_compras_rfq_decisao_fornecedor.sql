-- Compras RFQ: campos de aprovação, decisão comercial e comparação de propostas.
-- Compatível com as tabelas RFQ existentes; não remove nem recria dados.
alter table public.erp_rfq
  add column if not exists justificativa_escolha text,
  add column if not exists status_aprovacao varchar(30) not null default 'EM_ANALISE',
  add column if not exists comprador_responsavel varchar(100),
  add column if not exists data_limite date,
  add column if not exists previsao_entrega date,
  add column if not exists menor_custo_liquido_atendido boolean not null default true;

alter table public.erp_rfq_fornecedores
  add column if not exists selecionado_para_pedido boolean not null default false,
  add column if not exists custo_liquido_total numeric(18,2) not null default 0;

do $$ begin
  alter table public.erp_rfq_fornecedores
    add constraint erp_rfq_fornecedores_custo_liquido_chk
    check (custo_liquido_total >= 0);
exception when duplicate_object then null; end $$;
