begin;

alter table public.erp_pcp_programacoes
  add column if not exists ficha_processo_id uuid,
  add column if not exists ficha_processo_revisao integer;

do $$
begin
  if not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.erp_pcp_programacoes'::regclass
        and conname = 'erp_pcp_programacoes_ficha_processo_tenant_fk'
  ) then
    alter table public.erp_pcp_programacoes
      add constraint erp_pcp_programacoes_ficha_processo_tenant_fk
      foreign key (empresa_id, ficha_processo_id)
      references public.erp_fichas_processo (empresa_id, id);
  end if;

  if not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.erp_pcp_programacoes'::regclass
        and conname = 'erp_pcp_programacoes_ficha_processo_revisao_check'
  ) then
    alter table public.erp_pcp_programacoes
      add constraint erp_pcp_programacoes_ficha_processo_revisao_check
      check (ficha_processo_revisao is null or ficha_processo_revisao > 0);
  end if;

end $$;

create index if not exists idx_erp_pcp_programacoes_ficha_processo
  on public.erp_pcp_programacoes (empresa_id, ficha_processo_id)
  where ficha_processo_id is not null;

comment on column public.erp_pcp_programacoes.ficha_processo_id is
  'Ficha de processo liberada usada como referência para os parâmetros desta programação.';
comment on column public.erp_pcp_programacoes.ficha_processo_revisao is
  'Número da revisão copiado na criação da programação para preservar a referência histórica.';

commit;
