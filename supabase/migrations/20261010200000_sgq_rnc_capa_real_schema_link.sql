-- Connect RNC records to the existing CAPA model and persist segregated quantity.
begin;

alter table public.erp_rpnc
  add column if not exists quantidade_segregada numeric not null default 0;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'erp_rpnc_quantidade_segregada_nonnegative'
      and conrelid = 'public.erp_rpnc'::regclass
  ) then
    alter table public.erp_rpnc
      add constraint erp_rpnc_quantidade_segregada_nonnegative
      check (quantidade_segregada >= 0);
  end if;
end;
$migration$;

alter table public.qualidade_rnc_capa
  add column if not exists rpnc_id uuid;

create unique index if not exists qualidade_rnc_capa_empresa_rpnc_uq
  on public.qualidade_rnc_capa (empresa_id, rpnc_id)
  where rpnc_id is not null;

do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'qualidade_rnc_capa_empresa_rpnc_fkey'
      and conrelid = 'public.qualidade_rnc_capa'::regclass
  ) then
    alter table public.qualidade_rnc_capa
      add constraint qualidade_rnc_capa_empresa_rpnc_fkey
      foreign key (empresa_id, rpnc_id)
      references public.erp_rpnc (empresa_id, id)
      on delete cascade;
  end if;
end;
$migration$;

notify pgrst, 'reload schema';
commit;
