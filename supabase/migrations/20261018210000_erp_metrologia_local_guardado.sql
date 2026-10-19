-- REV-MET-002 | 2026-10-18
-- Local físico de guarda do instrumento de medição.
-- A migração fica versionada no repositório; aplicar ao projeto remoto somente após autorização/acesso.
begin;
alter table public.erp_equipamentos_medicao
  add column if not exists local_guardado text null;
comment on column public.erp_equipamentos_medicao.local_guardado is
  'Local físico de guarda do instrumento (armário, gaveta ou almoxarifado técnico).';
commit;
