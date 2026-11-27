begin;

-- Reserva de estoque só pode ser acionada por usuários autorizados de Vendas/PCP.
create or replace function public.erp_reservar_saldo_pedido_item(p_pedido_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_item record;
  v_produto record;
  v_reserva_id uuid;
  v_reserva_atual numeric := 0;
  v_total_reservado numeric := 0;
  v_op_qty numeric := 0;
  v_need numeric := 0;
  v_disponivel numeric := 0;
  v_delta numeric := 0;
  v_nova_reserva numeric := 0;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not (public.erp_is_master()
      or public.erp_has_permission('production.create')
      or public.erp_has_permission('production.update')
      or public.erp_has_permission('sales.update')) then
    raise exception 'SEM_PERMISSAO_PARA_RESERVAR_ESTOQUE_DO_PEDIDO' using errcode='42501';
  end if;

  select i.id, i.pedido_id, i.produto_id, i.quantidade
    into v_item
  from public.erp_pedidos_venda_itens i
  where i.id = p_pedido_item_id and i.empresa_id = v_empresa
  for update;
  if not found then raise exception 'Item do pedido não encontrado na empresa atual.'; end if;

  select p.id, greatest(coalesce(p.estoque_atual, 0), 0) as estoque
    into v_produto
  from public.erp_produtos p
  where p.id = v_item.produto_id and p.empresa_id = v_empresa and p.ativo = true
  for update;
  if not found then raise exception 'Produto inativo ou não encontrado na empresa atual.'; end if;

  select r.id, r.quantidade into v_reserva_id, v_reserva_atual
  from public.erp_estoque_reservas r
  where r.empresa_id = v_empresa and r.pedido_item_id = v_item.id and r.status = 'ATIVA'
  for update;
  v_reserva_atual := coalesce(v_reserva_atual, 0);

  select coalesce(sum(r.quantidade), 0) into v_total_reservado
  from public.erp_estoque_reservas r
  where r.empresa_id = v_empresa and r.produto_id = v_item.produto_id and r.status = 'ATIVA';

  select coalesce(sum(greatest(coalesce(op.quantidade_planejada, op.quantidade, 0), 0)), 0)
    into v_op_qty
  from public.erp_ordens_producao op
  where op.empresa_id = v_empresa
    and op.pedido_item_id = v_item.id
    and lower(coalesce(op.status, '')) not in ('concluido','concluída','concluida','cancelado','cancelada','rejeitado','rejeitada','finalizado','finalizada');

  v_need := greatest(coalesce(v_item.quantidade, 0) - v_reserva_atual - v_op_qty, 0);
  v_disponivel := greatest(v_produto.estoque - greatest(v_total_reservado - v_reserva_atual, 0) - v_reserva_atual, 0);
  v_delta := least(v_need, v_disponivel);
  v_nova_reserva := v_reserva_atual + v_delta;

  if v_delta > 0 then
    if v_reserva_id is not null then
      update public.erp_estoque_reservas
      set quantidade = v_nova_reserva, updated_at = now()
      where id = v_reserva_id and empresa_id = v_empresa;
    else
      insert into public.erp_estoque_reservas(
        empresa_id, pedido_venda_id, pedido_item_id, produto_id, quantidade, status
      )
      values(v_empresa, v_item.pedido_id, v_item.id, v_item.produto_id, v_nova_reserva, 'ATIVA')
      returning id into v_reserva_id;
    end if;

    update public.erp_produto_estoque
    set quantidade_reservada = coalesce(quantidade_reservada, 0) + v_delta,
        quantidade_disponivel = greatest(coalesce(quantidade_disponivel, 0) - v_delta, 0),
        updated_at = now()
    where empresa_id = v_empresa and produto_id = v_item.produto_id;

    insert into public.erp_estoque_movimentos(
      empresa_id, produto_id, tipo, quantidade, origem, pedido_venda_id, observacao
    )
    values(
      v_empresa, v_item.produto_id, 'reserva', v_delta, 'venda', v_item.pedido_id,
      'Reserva transacional iniciada pela carteira de pedidos pendentes do PCP.'
    );
  end if;

  return jsonb_build_object(
    'pedido_item_id', v_item.id,
    'pedido_id', v_item.pedido_id,
    'produto_id', v_item.produto_id,
    'quantidade_pedida', v_item.quantidade,
    'quantidade_reservada', v_nova_reserva,
    'quantidade_reservada_agora', v_delta,
    'quantidade_faltante', greatest(coalesce(v_item.quantidade, 0) - v_nova_reserva - v_op_qty, 0),
    'status', case when v_nova_reserva >= coalesce(v_item.quantidade, 0) then 'reservado' else 'reserva_parcial' end
  );
end;
$$;

revoke all on function public.erp_reservar_saldo_pedido_item(uuid) from public, anon;
grant execute on function public.erp_reservar_saldo_pedido_item(uuid) to authenticated;

-- Ao encaminhar uma linha ao PCP, reservar primeiro o saldo disponível.
-- A quantidade enviada à fila passa a ser a necessidade líquida real.
create or replace function public.erp_pcp_enviar_demanda(p_pedido_item_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path=pg_catalog,public
as $function$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_item record;
  v_reservada numeric;
  v_op_aberta numeric;
  v_qtd_pcp numeric;
  v_inserted integer := 0;
begin
  if auth.uid() is null or v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
  if not (public.erp_is_master()
      or public.erp_has_permission('production.create')
      or public.erp_has_permission('production.update')) then
    raise exception 'SEM_PERMISSAO_PARA_ENVIAR_DEMANDA_AO_PCP' using errcode='42501';
  end if;
  if coalesce(array_length(p_pedido_item_ids,1),0)=0 then raise exception 'PCP_EMPTY_SELECTION'; end if;

  for v_item in
    select i.id pedido_item_id,i.pedido_id,i.produto_id,i.quantidade,pv.numero,pv.cliente_id,pv.data_entrega_prometida,
           c.nome cliente_nome,p.codigo produto_codigo,p.nome produto_nome,coalesce(p.unidade,'UN') unidade
    from public.erp_pedidos_venda_itens i
    join public.erp_pedidos_venda pv on pv.id=i.pedido_id and pv.empresa_id=v_empresa
    join public.erp_produtos p on p.id=i.produto_id and p.empresa_id=v_empresa and p.ativo=true
    left join public.erp_clientes c on c.id=pv.cliente_id and c.empresa_id=v_empresa
    where i.empresa_id=v_empresa and i.id=any(p_pedido_item_ids)
      and lower(coalesce(pv.status,'')) not in ('cancelado','cancelada','rejeitado','rejeitada')
    order by pv.data_entrega_prometida nulls last,pv.numero,i.id
    for update of i
  loop
    perform public.erp_reservar_saldo_pedido_item(v_item.pedido_item_id);

    select coalesce(sum(r.quantidade),0) into v_reservada
    from public.erp_estoque_reservas r
    where r.empresa_id=v_empresa and r.pedido_item_id=v_item.pedido_item_id and upper(coalesce(r.status,''))='ATIVA';

    select coalesce(sum(greatest(coalesce(o.quantidade_planejada,o.quantidade,0)-coalesce(o.quantidade_produzida,0),0)),0)
      into v_op_aberta
    from public.erp_ordens_producao o
    where o.empresa_id=v_empresa and o.pedido_item_id=v_item.pedido_item_id
      and lower(coalesce(o.status,'')) not in ('cancelada','cancelado','concluida','concluido','encerrada','encerrado','finalizada','finalizado');

    v_qtd_pcp := greatest(coalesce(v_item.quantidade,0)-v_reservada-v_op_aberta,0);
    if v_qtd_pcp<=0 then continue; end if;

    insert into public.erp_pcp_fila_demanda(
      empresa_id,pedido_venda_id,pedido_item_id,produto_id,cliente_id,pedido_numero,cliente_nome,produto_codigo,produto_nome,unidade,
      quantidade_pedida,quantidade_pcp,quantidade_reservada,quantidade_op_aberta,data_necessaria,prioridade,status,enviado_por
    ) values(
      v_empresa,v_item.pedido_id,v_item.pedido_item_id,v_item.produto_id,v_item.cliente_id,v_item.numero::text,
      coalesce(v_item.cliente_nome,'Cliente não identificado'),v_item.produto_codigo,v_item.produto_nome,v_item.unidade,
      v_item.quantidade,v_qtd_pcp,v_reservada,v_op_aberta,v_item.data_entrega_prometida,'REGULAR','AGUARDANDO_PCP',auth.uid()
    )
    on conflict(empresa_id,pedido_item_id) where status in ('AGUARDANDO_PCP','EM_ANALISE','PROGRAMADA') do nothing;
    if found then v_inserted := v_inserted + 1; end if;
  end loop;
  return v_inserted;
end;
$function$;
revoke all on function public.erp_pcp_enviar_demanda(uuid[]) from public,anon;
grant execute on function public.erp_pcp_enviar_demanda(uuid[]) to authenticated;

-- A conversão para OP exige permissão de criação/atualização de produção.
create or replace function public.erp_pcp_converter_demanda_em_op(p_fila_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_demanda public.erp_pcp_fila_demanda%rowtype;
  v_ficha uuid;
  v_op uuid;
  v_numero bigint;
begin
  if auth.uid() is null or v_empresa is null then raise exception 'ERP_TENANT_NOT_FOUND'; end if;
  if not (public.erp_is_master()
      or public.erp_has_permission('production.create')
      or public.erp_has_permission('production.update')) then
    raise exception 'SEM_PERMISSAO_PARA_CRIAR_OP' using errcode='42501';
  end if;
  if p_fila_id is null then raise exception 'PCP_FILA_ID_OBRIGATORIO'; end if;

  select * into v_demanda from public.erp_pcp_fila_demanda
  where id=p_fila_id and empresa_id=v_empresa for update;
  if not found then raise exception 'PCP_DEMANDA_FORA_DO_TENANT'; end if;
  if v_demanda.status<>'PROGRAMADA' or v_demanda.ordem_producao_id is not null then
    raise exception 'PCP_DEMANDA_NAO_ESTA_PROGRAMADA_OU_JA_FOI_CONVERTIDA';
  end if;

  select id into v_ficha from public.erp_fichas_tecnicas
  where empresa_id=v_empresa and produto_id=v_demanda.produto_id and ativa=true
  order by versao desc,updated_at desc limit 1;
  if v_ficha is null then raise exception 'PRODUTO_SEM_FICHA_TECNICA_ATIVA'; end if;

  if exists(select 1 from public.erp_ficha_operacoes
    where empresa_id=v_empresa and ficha_id=v_ficha and upper(operacao) in ('INJECAO','PRENSAGEM'))
    and not exists(
      select 1 from public.erp_receitas_processos r
      join public.erp_processos_industriais p on p.id=r.processo_id and p.empresa_id=v_empresa
      where r.empresa_id=v_empresa and r.produto_id=v_demanda.produto_id
        and r.status='APROVADA' and p.tipo in ('INJECAO','PRENSADOS') and p.ativo=true
    ) then
    raise exception 'RECEITA_DE_PROCESSO_NAO_APROVADA: homologue a ficha em Processo Industrial antes de gerar OP.';
  end if;

  select id,numero_op into v_op,v_numero
  from public.erp_criar_ordem_producao_v2(
    v_demanda.produto_id,v_demanda.quantidade_pcp,v_demanda.pedido_venda_id,null,null,false
  );
  update public.erp_ordens_producao set pedido_item_id=v_demanda.pedido_item_id,ficha_id=v_ficha
  where id=v_op and empresa_id=v_empresa;
  update public.erp_pcp_fila_demanda set status='CONVERTIDA_OP',ordem_producao_id=v_op,
    analisado_em=coalesce(analisado_em,now()),updated_at=now()
  where id=v_demanda.id and empresa_id=v_empresa;

  return jsonb_build_object('ordem_producao_id',v_op,'numero_op',v_numero,
    'pedido_numero',v_demanda.pedido_numero,'produto_codigo',v_demanda.produto_codigo);
end;
$$;
revoke all on function public.erp_pcp_converter_demanda_em_op(uuid) from public,anon;
grant execute on function public.erp_pcp_converter_demanda_em_op(uuid) to authenticated;

-- RBAC real nas tabelas operacionais do PCP. Sem DELETE direto de OP/fila/reserva.
alter table public.erp_pcp_fila_demanda enable row level security;
drop policy if exists erp_pcp_fila_demanda_select on public.erp_pcp_fila_demanda;
drop policy if exists erp_pcp_fila_demanda_insert on public.erp_pcp_fila_demanda;
drop policy if exists erp_pcp_fila_demanda_update on public.erp_pcp_fila_demanda;
drop policy if exists erp_pcp_fila_demanda_delete on public.erp_pcp_fila_demanda;
create policy erp_pcp_fila_demanda_select on public.erp_pcp_fila_demanda
for select to authenticated using (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('production.read')) or
      (select public.erp_has_permission('production.create')) or
      (select public.erp_has_permission('production.update'))
    )
  )
);
create policy erp_pcp_fila_demanda_insert on public.erp_pcp_fila_demanda
for insert to authenticated with check (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('production.create')) or
      (select public.erp_has_permission('production.update'))
    )
  )
);
create policy erp_pcp_fila_demanda_update on public.erp_pcp_fila_demanda
for update to authenticated using (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('production.create')) or
      (select public.erp_has_permission('production.update'))
    )
  )
) with check (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('production.create')) or
      (select public.erp_has_permission('production.update'))
    )
  )
);
revoke delete,truncate,references,trigger on public.erp_pcp_fila_demanda from authenticated;
grant select,insert,update on public.erp_pcp_fila_demanda to authenticated;

alter table public.erp_ordens_producao enable row level security;
drop policy if exists erp_tenant_isolation on public.erp_ordens_producao;
create policy erp_ordens_producao_select_rbac on public.erp_ordens_producao
for select to authenticated using (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('production.read')) or
      (select public.erp_has_permission('production.create')) or
      (select public.erp_has_permission('production.update'))
    )
  )
);
create policy erp_ordens_producao_insert_rbac on public.erp_ordens_producao
for insert to authenticated with check (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and
    (select public.erp_has_permission('production.create'))
  )
);
create policy erp_ordens_producao_update_rbac on public.erp_ordens_producao
for update to authenticated using (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('production.update')) or
      (select public.erp_has_permission('production.create'))
    )
  )
) with check (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('production.update')) or
      (select public.erp_has_permission('production.create'))
    )
  )
);
revoke delete,truncate,references,trigger on public.erp_ordens_producao from authenticated;
grant select,insert,update on public.erp_ordens_producao to authenticated;

-- A reserva é mutável somente pela RPC transacional acima.
alter table public.erp_estoque_reservas enable row level security;
drop policy if exists erp_estoque_reservas_tenant on public.erp_estoque_reservas;
create policy erp_estoque_reservas_select_rbac on public.erp_estoque_reservas
for select to authenticated using (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('sales.read')) or
      (select public.erp_has_permission('sales.update')) or
      (select public.erp_has_permission('production.read')) or
      (select public.erp_has_permission('production.create')) or
      (select public.erp_has_permission('production.update'))
    )
  )
);
create policy erp_estoque_reservas_insert_rbac on public.erp_estoque_reservas
for insert to authenticated with check (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('sales.update')) or
      (select public.erp_has_permission('production.create')) or
      (select public.erp_has_permission('production.update'))
    )
  )
);
create policy erp_estoque_reservas_update_rbac on public.erp_estoque_reservas
for update to authenticated using (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('sales.update')) or
      (select public.erp_has_permission('production.create')) or
      (select public.erp_has_permission('production.update'))
    )
  )
) with check (
  (select public.erp_is_master()) or (
    empresa_id=(select public.erp_current_empresa_id()) and (
      (select public.erp_has_permission('sales.update')) or
      (select public.erp_has_permission('production.create')) or
      (select public.erp_has_permission('production.update'))
    )
  )
);
revoke delete,truncate,references,trigger on public.erp_estoque_reservas from authenticated;
grant select,insert,update on public.erp_estoque_reservas to authenticated;

commit;
notify pgrst, 'reload schema';
