alter table public.erp_documentos_qualidade_leituras
  drop constraint if exists erp_documentos_qualidade_leituras_revisao_check;
alter table public.erp_documentos_qualidade_leituras
  add constraint erp_documentos_qualidade_leituras_revisao_nonnegative
  check (revisao >= 0);
