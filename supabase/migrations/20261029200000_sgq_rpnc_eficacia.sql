-- SYSNQRA ERP INDUSTRIAL | SGQ / RPNC | 2026-10-29
-- Aditiva: preserva dados existentes e usa a tabela CAPA já relacionada à RPNC.
begin;

alter table public.qualidade_rnc_capa
  add column if not exists prazo_eficacia_dias integer,
  add column if not exists data_verificacao_eficacia timestamptz,
  add column if not exists parecer_eficacia text,
  add column if not exists eficacia_aprovada boolean;

alter table public.qualidade_rnc_capa
  drop constraint if exists qualidade_rnc_capa_prazo_eficacia_dias_ck;

alter table public.qualidade_rnc_capa
  add constraint qualidade_rnc_capa_prazo_eficacia_dias_ck
  check (prazo_eficacia_dias is null or prazo_eficacia_dias in (30, 60));

create index if not exists qualidade_rnc_capa_eficacia_pendente_idx
  on public.qualidade_rnc_capa (empresa_id, data_verificacao_eficacia)
  where eficacia_aprovada is null;

commit;
