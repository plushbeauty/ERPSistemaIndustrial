-- ============================================================================
-- SYSNQRA ERP INDUSTRIAL — EXPEDICAO: RASTREIO E VINCULO AO PEDIDO DE VENDA
-- @AUTOR: Fernando Schuinsekel
-- Data: 2026-11-04
--
-- POR QUE ESTA MIGRATION EXISTE
-- Duas telas gravam/leem colunas que nenhuma migration criou em erp_expedicoes:
--   1) src/pages/CentraisIndustriais.tsx:55 insere "rastreio" no cadastro da
--      expedicao. Sem a coluna, o Postgres devolve 42703 e o cadastro e
--      abortado com erro de "column ... does not exist".
--   2) src/pages/VendasCentral.tsx:118 le "pedido_venda_id" (select e filtro .in)
--      para mostrar, no status do pedido, qual expedicao já foi criada. Sem a
--      coluna, a consulta da Central de Vendas falha e o painel de expedicao
--      nunca aparece.
-- A tabela foi criada em 20260927152553_erp_expedicao_logistica_v1.sql e
-- complementada em 20261005170000_fix_expedicao_logistica_schema.sql; nenhuma
-- das duas adicionou esses campos. Nada foi inventado no frontend: os dois
-- campos passam a existir no banco, com o mesmo contrato de tenant das demais
-- colunas. Nenhum dado existente e alterado: as colunas nascem nulas.
-- ============================================================================

begin;

alter table if exists public.erp_expedicoes
  add column if not exists rastreio text;

alter table if exists public.erp_expedicoes
  add column if not exists pedido_venda_id uuid references public.erp_pedidos_venda(id) on delete set null;

-- Leitura da Central de Vendas: "quais expedicoes existem para estes pedidos".
create index if not exists idx_erp_expedicoes_empresa_pedido_venda
  on public.erp_expedicoes (empresa_id, pedido_venda_id);

comment on column public.erp_expedicoes.rastreio is
  'Codigo de rastreio informado no cadastro da expedicao (CentraisIndustriais). Livre, sem validacao de transportadora.';
comment on column public.erp_expedicoes.pedido_venda_id is
  'Pedido de venda que a expedicao atende. Nulo em expedicoes criadas antes de 2026-11-04; a Central de Vendas so mostra expedicoes vinculadas.';
comment on table public.erp_expedicoes is
  'Expedicoes proprias criadas no modulo de Expedicao. Revisao 2026-11-04 ganhou rastreio e vinculo direto com o pedido de venda.';

commit;
