begin;

create unique index if not exists ux_erp_op_empresa_numero
  on public.erp_ordens_producao (empresa_id, numero_op);

create or replace function public.erp_criar_ordem_producao_v2(
  p_produto_id uuid,
  p_quantidade numeric,
  p_pedido_venda_id uuid default null,
  p_maquina_id uuid default null,
  p_velocidade_nominal_hora numeric default null,
  p_operacao_dupla boolean default false
)
returns table(
  id uuid,
  numero_op bigint,
  ficha_id uuid,
  maquina_id uuid,
  ciclo_seg numeric,
  cavidades integer,
  tempo_estimado_horas numeric
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_cliente uuid;
  v_ficha uuid;
  v_maquina uuid;
  v_ciclo numeric;
  v_cavidades integer := 1;
  v_velocidade numeric;
  v_tempo numeric;
  v_numero bigint;
begin
  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;
  if p_produto_id is null or p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Produto e quantidade maior que zero são obrigatórios.';
  end if;
  if not exists (
    select 1 from public.erp_produtos p
    where p.id = p_produto_id and p.empresa_id = v_empresa and p.ativo = true
  ) then
    raise exception 'Produto inativo ou fora da empresa atual.';
  end if;

  if p_pedido_venda_id is not null then
    select pv.cliente_id into v_cliente
    from public.erp_pedidos_venda pv
    where pv.id = p_pedido_venda_id and pv.empresa_id = v_empresa
      and lower(coalesce(pv.status, '')) not in ('cancelado','cancelada','rejeitado','rejeitada');
    if not found then
      raise exception 'Pedido de venda inexistente, cancelado ou fora da empresa atual.';
    end if;
    if not exists (
      select 1 from public.erp_pedidos_venda_itens i
      where i.empresa_id = v_empresa and i.pedido_id = p_pedido_venda_id
        and i.produto_id = p_produto_id
    ) then
      raise exception 'O produto selecionado não pertence aos itens do pedido de venda.';
    end if;
  end if;

  select f.id into v_ficha
  from public.erp_fichas_tecnicas f
  where f.empresa_id = v_empresa and f.produto_id = p_produto_id and f.ativa = true
  order by f.versao desc, f.updated_at desc
  limit 1;

  if v_ficha is not null then
    select fo.maquina_id, fo.ciclo_seg, greatest(coalesce(m.cavidades_ativas, 1), 1)
      into v_maquina, v_ciclo, v_cavidades
    from public.erp_ficha_operacoes fo
    left join public.erp_moldes m on m.id = fo.molde_id and m.empresa_id = v_empresa
    where fo.empresa_id = v_empresa and fo.ficha_id = v_ficha
    order by fo.sequencia
    limit 1;
  end if;
  v_cavidades := coalesce(v_cavidades, 1);
  v_maquina := coalesce(p_maquina_id, v_maquina);
  if v_maquina is not null and not exists (
    select 1 from public.erp_maquinas m
    where m.id = v_maquina and m.empresa_id = v_empresa
      and m.ativo = true and upper(coalesce(m.status,'')) <> 'INATIVA'
  ) then
    raise exception 'Máquina não pertence à empresa ou está inativa.';
  end if;

  v_velocidade := p_velocidade_nominal_hora;
  if v_velocidade is null or v_velocidade <= 0 then
    if v_ciclo is not null and v_ciclo > 0 and v_cavidades > 0 then
      v_velocidade := (3600 / v_ciclo) * v_cavidades;
    end if;
  end if;
  if p_operacao_dupla and v_velocidade is not null then
    v_velocidade := v_velocidade * 2;
  end if;
  if v_velocidade is not null and v_velocidade > 0 then
    v_tempo := p_quantidade / v_velocidade;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_empresa::text, 0));
  select coalesce(max(case when o.numero_op ~ '^[0-9]+$' then o.numero_op::bigint end), 0) + 1
    into v_numero
  from public.erp_ordens_producao o
  where o.empresa_id = v_empresa;

  return query
  insert into public.erp_ordens_producao (
    empresa_id, numero_op, produto_id, ficha_id, pedido_venda_id, cliente_id,
    quantidade, quantidade_planejada, quantidade_produzida, status, maquina_id,
    velocidade_nominal_hora, operacao_dupla, tempo_estimado_horas, prioridade
  ) values (
    v_empresa, v_numero::text, p_produto_id, v_ficha, p_pedido_venda_id, v_cliente,
    p_quantidade, p_quantidade, 0, 'pendente', v_maquina,
    v_velocidade, coalesce(p_operacao_dupla, false), v_tempo, 'ALTA'
  )
  returning erp_ordens_producao.id, v_numero, erp_ordens_producao.ficha_id,
            erp_ordens_producao.maquina_id, v_ciclo, v_cavidades,
            erp_ordens_producao.tempo_estimado_horas;
end;
$$;

revoke all on function public.erp_criar_ordem_producao_v2(uuid,numeric,uuid,uuid,numeric,boolean) from public, anon;
grant execute on function public.erp_criar_ordem_producao_v2(uuid,numeric,uuid,uuid,numeric,boolean) to authenticated;

notify pgrst, 'reload schema';
commit;