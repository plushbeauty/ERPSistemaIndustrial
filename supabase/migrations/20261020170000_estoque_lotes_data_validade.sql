-- SYSNQRA ERP & SGQ INDUSTRIAL
-- Revisão 1.1 | 20/10/2026
-- Validade no mesmo registro de rastreabilidade criado pelo recebimento transacional.
begin;

alter table public.erp_estoque_lotes_rastreabilidade
  add column if not exists data_validade date;

create index if not exists idx_erp_lotes_rastreabilidade_empresa_validade
  on public.erp_estoque_lotes_rastreabilidade (empresa_id, data_validade, created_at);

commit;
