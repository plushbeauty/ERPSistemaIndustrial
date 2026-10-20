-- SYSNQRA ERP & SGQ INDUSTRIAL
-- Revisão 1.0 | 20/10/2026
-- Acrescenta a validade ao contrato de lotes já utilizado pelo recebimento,
-- separação, qualidade e genealogia. Não cria uma tabela paralela.
begin;

alter table public.erp_estoque_lotes
  add column if not exists data_validade date;

create index if not exists idx_erp_estoque_lotes_empresa_validade
  on public.erp_estoque_lotes (empresa_id, data_validade, data_entrada);

-- A tabela já possui RLS e policies tenant-scoped nas migrations anteriores.
-- Esta migration não remove nem substitui políticas existentes.

commit;
