-- @AUTOR: FernandoSch
-- @DATA_REVISAO_APROVACAO: 2026-11-03
-- @REVISAO: REV-CONTRATO-BANCO-20261103-01
-- Regra do proprietário: prazo e vencimento são calculados pelo servidor, e não pelo relógio do navegador.
-- erp_data_servidor() devolve o relógio do Postgres para as telas que precisam comparar datas
-- (calibração de instrumento, atraso de OP, janelas de vencimento). Não expõe nenhuma tabela.

do $mig$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'erp_data_servidor') then
    raise notice 'erp_data_servidor ja existe neste banco; corpo preservado.';
  else
    execute $fn$
create or replace function public.erp_data_servidor()
returns timestamptz
language sql
stable
security invoker
set search_path = public
as $$
  select now();
$$;
$fn$;
    execute 'revoke all on function public.erp_data_servidor() from public, anon';
    execute 'grant execute on function public.erp_data_servidor() to authenticated';
  end if;
end $mig$;
