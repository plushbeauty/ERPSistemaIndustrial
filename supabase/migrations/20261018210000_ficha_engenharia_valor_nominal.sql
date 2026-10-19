-- Revisão de Engenharia de Software Industrial
-- Data: 18/10/2026
-- Objetivo: persistir o valor nominal dos controles de qualidade da ficha de engenharia.
-- Idempotente: pode ser aplicada mais de uma vez sem duplicar a coluna.
alter table public.erp_planos_inspecao
  add column if not exists valor_nominal text;

comment on column public.erp_planos_inspecao.valor_nominal is
  'Valor nominal técnico informado na ficha de engenharia; separado dos limites inferior e superior.';
