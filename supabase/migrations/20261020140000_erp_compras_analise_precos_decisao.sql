-- Revisão Compras — Análise de preços — 20/10/2026
-- Persistência da decisão comercial na RFQ real, mantendo o isolamento por empresa.
alter table public.erp_rfq
  add column if not exists fornecedor_escolhido_id uuid references public.erp_fornecedores(id),
  add column if not exists menor_preco_ofertado numeric(18,2),
  add column if not exists justificativa_escolha text,
  add column if not exists status_aprovacao text not null default 'EM_ANALISE';

do $$
begin
  alter table public.erp_rfq
    add constraint erp_rfq_status_aprovacao_chk
    check (status_aprovacao in ('EM_ANALISE','PENDENTE_APROVACAO','APROVADA','REJEITADA'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.erp_rfq
    add constraint erp_rfq_menor_preco_ofertado_chk
    check (menor_preco_ofertado is null or menor_preco_ofertado >= 0);
exception when duplicate_object then null;
end $$;

create index if not exists idx_erp_rfq_empresa_status_aprovacao
  on public.erp_rfq (empresa_id, status_aprovacao, created_at desc);
