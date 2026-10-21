-- Compras / RFQ — revisão 20/10/2026
-- Complementa a tabela nativa sem alterar o tipo da coluna data_emissao,
-- que já existe como date e tem default current_date na migration base.
alter table public.erp_rfq
  add column if not exists comprador_responsavel varchar(100),
  add column if not exists termo_condicao_geral text;

comment on column public.erp_rfq.comprador_responsavel is
  'Responsável pela emissão e acompanhamento da solicitação de cotação.';
comment on column public.erp_rfq.termo_condicao_geral is
  'Termos e condições gerais aplicáveis à solicitação de cotação.';
