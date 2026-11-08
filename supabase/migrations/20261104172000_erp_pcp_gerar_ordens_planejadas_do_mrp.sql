-- ============================================================================
-- SYSNQRA ERP INDUSTRIAL — PCP: GERACAO DAS ORDENS PLANEJADAS A PARTIR DO MRP
-- @AUTOR: FernandoSch
-- Data: 2026-11-04
--
-- O DEFEITO QUE ESTA MIGRATION FECHA
-- A tela PCPPlanejamentoIndustrial.tsx:90 lia as necessidades do ultimo run de
-- MRP com .limit(3000) e somava as quantidades no navegador antes de gravar em
-- erp_pcp_ordens_planejadas. Um run com mais de 3000 linhas de necessidade
-- (produto raiz com estrutura profunda, varios pedidos no mesmo run) era
-- truncado em silencio e a ordem planejada era gravada com quantidade MENOR que
-- a real. Aqui o truncamento nao e um KPI inexato: e ordem de producao errada
-- entrando no sistema.
--
-- O QUE ESTA MIGRATION FAZ
-- RPC erp_pcp_gerar_ordens_planejadas_do_mrp(date) faz a explosao agregada no
-- banco, sobre TODAS as linhas do ultimo run da empresa, e grava dentro da
-- mesma transacao. Mantem a regra de negocio da tela (so PRODUZIR, so
-- necessidade liquida positiva, nao duplicar ordem PLANEJADA de origem MRP ja
-- aberta) e registra a acao em erp_audit_logs com a grafia oficial.
--
-- SEGURANCA
-- security definer com search_path fixo; a empresa vem de
-- public.erp_current_empresa_id() e todo filtro usa empresa_id, inclusive o
-- do run e o do anti-duplicidade. EXECUTE apenas para authenticated; anon e
-- public sem permissao.
-- ============================================================================

begin;

create or replace function public.erp_pcp_gerar_ordens_planejadas_do_mrp(
  p_data_necessaria date default current_date
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_run uuid;
  v_criadas integer := 0;
  v_total numeric := 0;
  v_necessidades integer := 0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_empresa := public.erp_current_empresa_id();
  if v_empresa is null then
    raise exception 'EMPRESA_REQUIRED';
  end if;

  select r.id into v_run
  from public.erp_mrp_runs r
  where r.empresa_id = v_empresa
  order by r.created_at desc, r.id desc
  limit 1;

  if v_run is null then
    return jsonb_build_object(
      'ok', true, 'run_id', null, 'criadas', 0, 'quantidade_total', 0, 'aviso', 'MRP_NAO_EXECUTADO'
    );
  end if;

  with necessidades as (
    select n.componente_id,
           round(sum(n.necessidade_liquida), 3)::numeric(18,3) as quantidade
    from public.erp_mrp_necessidades n
    where n.empresa_id = v_empresa
      and n.run_id = v_run
      and n.sugestao = 'PRODUZIR'
      and n.necessidade_liquida > 0
    group by n.componente_id
    having round(sum(n.necessidade_liquida), 3) > 0
  ),
  pendentes as (
    select k.componente_id, k.quantidade
    from necessidades k
    where not exists (
      select 1 from public.erp_pcp_ordens_planejadas o
      where o.empresa_id = v_empresa
        and o.produto_id = k.componente_id
        and o.origem = 'MRP'
        and o.status = 'PLANEJADA'
    )
  ),
  gravadas as (
    insert into public.erp_pcp_ordens_planejadas
      (empresa_id, produto_id, quantidade, data_necessaria, origem, status)
    select v_empresa, p.componente_id, p.quantidade, p_data_necessaria, 'MRP', 'PLANEJADA'
    from pendentes p
    returning quantidade
  )
  select count(*), coalesce(sum(quantidade), 0)
    into v_criadas, v_total
  from gravadas;

  select count(*) into v_necessidades
  from public.erp_mrp_necessidades n
  where n.empresa_id = v_empresa
    and n.run_id = v_run
    and n.sugestao = 'PRODUZIR'
    and n.necessidade_liquida > 0;

  insert into public.erp_audit_logs
    (empresa_id, actor_user_id, action, module, entity_type, entity_id, new_data, created_at)
  values
    (v_empresa, v_uid, 'PCP_GERAR_ORDENS_PLANEJADAS_MRP', 'PCP',
     'erp_pcp_ordens_planejadas', v_run,
     jsonb_build_object('run_id', v_run, 'criadas', v_criadas,
                        'quantidade_total', v_total, 'necessidades_produzir', v_necessidades,
                        'data_necessaria', p_data_necessaria),
     now());

  return jsonb_build_object(
    'ok', true, 'run_id', v_run, 'criadas', v_criadas,
    'quantidade_total', v_total, 'necessidades_produzir', v_necessidades
  );
end;
$$;

comment on function public.erp_pcp_gerar_ordens_planejadas_do_mrp(date) is
  'Agrega no banco todas as necessidades PRODUZIR do ultimo run de MRP da empresa e grava as ordens planejadas correspondentes, sem duplicar as ja abertas.';

revoke all on function public.erp_pcp_gerar_ordens_planejadas_do_mrp(date) from public, anon;
grant execute on function public.erp_pcp_gerar_ordens_planejadas_do_mrp(date) to authenticated;

commit;
