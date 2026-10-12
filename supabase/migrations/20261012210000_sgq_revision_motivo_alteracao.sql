begin;

alter table public.erp_qualidade_documentos_revisoes
  add column if not exists motivo_alteracao text;

commit;
