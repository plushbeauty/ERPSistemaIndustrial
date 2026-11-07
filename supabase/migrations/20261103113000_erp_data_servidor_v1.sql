-- @AUTOR: Fernando Schuinsekel
-- @DATA_REVISAO_APROVACAO: 2026-11-03
-- @REVISAO: REV-CONTRATO-BANCO-20261103-01
-- Regra do proprietario: prazos e vencimentos usam o relogio do Postgres.

do $mig$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'erp_data_servidor'
  ) then
    raise notice 'erp_data_servidor ja existe neste banco; corpo preservado.';
  else
    execute $fn$
      create function public.erp_data_servidor()
      returns timestamptz
      language sql
      stable
      security invoker
      set search_path = public
      as $body$
        select now();
      $body$;
    $fn$;
    execute 'revoke all on function public.erp_data_servidor() from public, anon';
    execute 'grant execute on function public.erp_data_servidor() to authenticated';
  end if;
end
$mig$;

notify pgrst, 'reload schema';
