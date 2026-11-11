-- SYSNQRA ERP INDUSTRIAL — endurecimento de permissões e resumo FMEA para MASTER
-- Revisão incremental e idempotente. Não remove dados nem altera tabelas existentes.

begin;

-- Não depender de default privileges do projeto: garantir DML autenticado,
-- sempre limitado pelas políticas RLS já instaladas nas tabelas.
grant select, insert, update, delete on table
  public.erp_fmea_cabecalho,
  public.erp_plano_controle,
  public.erp_plano_controle_linha
to authenticated;

-- A versão anterior filtrava somente por erp_current_empresa_id().
-- Para SUPER_ADMIN (empresa_id NULL), isso retornava totais vazios.
create or replace function public.erp_fmea_resumo(p_cabecalho_id uuid)
returns table (
  total_linhas bigint,
  npr_maximo integer,
  npr_medio numeric,
  criticas bigint,
  acoes_abertas bigint,
  acoes_concluidas bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    count(*)::bigint as total_linhas,
    max(f.npr)::integer as npr_maximo,
    round(avg(f.npr), 1) as npr_medio,
    count(*) filter (
      where f.caracteristica_especial in ('critica','seguranca','regulatoria')
    )::bigint as criticas,
    count(*) filter (
      where lower(coalesce(f.status_acao, '')) in ('aberta','em_andamento')
    )::bigint as acoes_abertas,
    count(*) filter (
      where lower(coalesce(f.status_acao, '')) = 'concluida'
    )::bigint as acoes_concluidas
  from public.qualidade_fmea f
  where f.cabecalho_id = p_cabecalho_id
    and (
      f.empresa_id = public.erp_current_empresa_id()
      or public.erp_is_master()
    );
$$;

revoke all on function public.erp_fmea_resumo(uuid) from public, anon;
grant execute on function public.erp_fmea_resumo(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
