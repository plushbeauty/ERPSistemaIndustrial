/*
 * ERP INDUSTRIAL — Pedido de Venda v2: análise de disponibilidade sem OP automática.
 * A interface decide quando gerar a OP; o banco impede OP duplicada por item.
 */
alter table public.erp_ordens_producao
  add column if not exists pedido_item_id uuid references public.erp_pedidos_venda_itens(id);

create index if not exists idx_erp_ordens_producao_pedido_item
  on public.erp_ordens_producao(pedido_item_id);

create unique index if not exists ux_erp_ordens_producao_pedido_item
  on public.erp_ordens_producao(pedido_item_id)
  where pedido_item_id is not null
    and status not in ('cancelada','CANCELADA');

create or replace function public.erp_criar_pedido_venda_com_analise(
  p_cliente_id uuid,
  p_desconto numeric default 0,
  p_itens jsonb default '[]'::jsonb,
  p_data_entrega date default null,
  p_pedido_cliente text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_usuario uuid;
  v_pedido uuid;
  v_item jsonb;
  v_produto uuid;
  v_qtd numeric;
  v_preco numeric;
  v_nome text;
  v_estoque numeric;
  v_reservado numeric;
  v_disponivel numeric;
  v_reserva numeric;
  v_falta numeric;
  v_subtotal numeric := 0;
  v_desconto numeric := greatest(coalesce(p_desconto,0),0);
  v_item_id uuid;
  v_numero bigint;
  v_fabricado boolean;
  v_result jsonb := '[]'::jsonb;
  v_tem_falta boolean := false;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;

  select u.id into v_usuario
  from public.erp_usuarios u
  where u.auth_user_id = auth.uid()
    and u.empresa_id = v_empresa
    and u.ativo = true
    and u.deleted_at is null
  limit 1;

  if v_usuario is null then raise exception 'Usuário ERP não localizado para a empresa atual.'; end if;

  if p_cliente_id is null or not exists(
    select 1 from public.erp_clientes c
    where c.id=p_cliente_id and c.empresa_id=v_empresa and c.ativo=true
  ) then raise exception 'Cliente inválido para a empresa atual.'; end if;

  if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0 then
    raise exception 'A venda precisa ter pelo menos um item.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text));

  select coalesce(max(numero),0)+1 into v_numero
  from public.erp_pedidos_venda
  where empresa_id=v_empresa;

  insert into public.erp_pedidos_venda(
    empresa_id,cliente_id,numero,status,total,created_by,data_entrega_prometida,pedido_cliente
  )
  values(
    v_empresa,p_cliente_id,v_numero,'em_analise',0,v_usuario,p_data_entrega,p_pedido_cliente
  )
  returning id into v_pedido;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto := nullif(v_item->>'produto_id','')::uuid;
    v_qtd := nullif(v_item->>'quantidade','')::numeric;

    if v_produto is null or v_qtd is null or v_qtd<=0 then
      raise exception 'Item de venda inválido.';
    end if;

    select p.preco_venda,
           coalesce(nullif(p.nome,''),p.descricao),
           greatest(coalesce(p.estoque_atual,0),0),
           coalesce(p.fabricado,false)
      into v_preco,v_nome,v_estoque,v_fabricado
    from public.erp_produtos p
    where p.id=v_produto and p.empresa_id=v_empresa and p.ativo=true
    for update;

    if not found then raise exception 'Produto inválido ou inativo.'; end if;

    select coalesce(sum(r.quantidade),0)
      into v_reservado
    from public.erp_estoque_reservas r
    where r.empresa_id=v_empresa
      and r.produto_id=v_produto
      and r.status='ATIVA';

    v_disponivel := greatest(v_estoque-v_reservado,0);
    v_reserva := least(v_qtd,v_disponivel);
    v_falta := greatest(v_qtd-v_reserva,0);
    v_tem_falta := v_tem_falta or v_falta>0;
    v_preco := greatest(coalesce(nullif(v_item->>'valor_unitario','')::numeric,v_preco),0);

    insert into public.erp_pedidos_venda_itens(
      empresa_id,pedido_id,produto_id,descricao,quantidade,valor_unitario,desconto,total,produto_cliente
    )
    values(
      v_empresa,v_pedido,v_produto,v_nome,v_qtd,v_preco,0,round(v_qtd*v_preco,2),
      nullif(v_item->>'codigo_cliente','')
    )
    returning id into v_item_id;

    v_subtotal := v_subtotal + round(v_qtd*v_preco,2);

    if v_reserva>0 then
      insert into public.erp_estoque_reservas(
        empresa_id,pedido_venda_id,pedido_item_id,produto_id,quantidade,status
      )
      values(v_empresa,v_pedido,v_item_id,v_produto,v_reserva,'ATIVA');

      update public.erp_produto_estoque
      set quantidade_reservada=coalesce(quantidade_reservada,0)+v_reserva,
          quantidade_disponivel=greatest(coalesce(quantidade_disponivel,0)-v_reserva,0),
          updated_at=now()
      where empresa_id=v_empresa and produto_id=v_produto;

      insert into public.erp_estoque_movimentos(
        empresa_id,produto_id,tipo,quantidade,origem,pedido_venda_id,observacao
      )
      values(
        v_empresa,v_produto,'reserva',v_reserva,'venda',v_pedido,
        'Reserva de estoque para pedido de venda — fluxo v2'
      );
    end if;

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'pedido_item_id',v_item_id,
      'produto_id',v_produto,
      'quantidade_pedida',v_qtd,
      'estoque_disponivel',v_disponivel,
      'quantidade_reservada',v_reserva,
      'quantidade_faltante',v_falta,
      'fabricado',v_fabricado,
      'pode_gerar_op',v_falta>0 and v_fabricado
    ));
  end loop;

  if v_desconto>v_subtotal then
    raise exception 'Desconto não pode ser maior que o subtotal.';
  end if;

  update public.erp_pedidos_venda
  set total=round(v_subtotal-v_desconto,2),
      status=case when v_tem_falta then 'necessita_producao' else 'reservado' end,
      updated_at=now()
  where id=v_pedido;

  return jsonb_build_object(
    'pedido_id',v_pedido,
    'numero',v_numero,
    'status',case when v_tem_falta then 'necessita_producao' else 'reservado' end,
    'itens',v_result
  );
end;
$$;

revoke all on function public.erp_criar_pedido_venda_com_analise(uuid,numeric,jsonb,date,text) from public;
grant execute on function public.erp_criar_pedido_venda_com_analise(uuid,numeric,jsonb,date,text) to authenticated;

create or replace function public.erp_gerar_op_pedido_item(p_pedido_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_item record;
  v_pedido record;
  v_produto record;
  v_reserva numeric;
  v_falta numeric;
  v_numero text;
  v_op_id uuid;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;

  select i.id,i.pedido_id,i.produto_id,i.quantidade
    into v_item
  from public.erp_pedidos_venda_itens i
  where i.id=p_pedido_item_id and i.empresa_id=v_empresa
  for update;

  if not found then raise exception 'Item de pedido não encontrado na empresa atual.'; end if;

  select p.id,p.numero,p.data_entrega_prometida,p.cliente_id
    into v_pedido
  from public.erp_pedidos_venda p
  where p.id=v_item.pedido_id and p.empresa_id=v_empresa;

  select p.id,p.codigo,p.nome,p.fabricado
    into v_produto
  from public.erp_produtos p
  where p.id=v_item.produto_id and p.empresa_id=v_empresa and p.ativo=true;

  if not found then raise exception 'Produto do item não está disponível.'; end if;

  if not coalesce(v_produto.fabricado,false) then
    raise exception 'Este produto não está marcado como fabricado; a necessidade deve seguir Compras.';
  end if;

  select coalesce(sum(r.quantidade),0) into v_reserva
  from public.erp_estoque_reservas r
  where r.pedido_item_id=v_item.id and r.status='ATIVA' and r.empresa_id=v_empresa;

  v_falta := greatest(v_item.quantidade-v_reserva,0);

  if v_falta<=0 then
    raise exception 'Não existe saldo faltante para gerar OP deste item.';
  end if;

  select op.id,op.numero_op into v_op_id,v_numero
  from public.erp_ordens_producao op
  where op.empresa_id=v_empresa
    and op.pedido_item_id=v_item.id
    and op.status not in ('cancelada','CANCELADA')
  limit 1;

  if v_op_id is not null then
    return jsonb_build_object('op_id',v_op_id,'numero_op',v_numero,'quantidade',v_falta,'ja_existia',true);
  end if;

  v_numero := 'OP-'||v_pedido.numero||'-'||replace(coalesce(v_produto.codigo,v_produto.id::text),'/','-');

  insert into public.erp_ordens_producao(
    empresa_id,numero_op,produto_id,quantidade,status,pedido_venda_id,pedido_item_id,
    data_prevista,cliente_id,prioridade,observacoes
  )
  values(
    v_empresa,v_numero,v_produto.id,v_falta,'pendente',v_pedido.id,v_item.id,
    v_pedido.data_entrega_prometida,v_pedido.cliente_id,'REGULAR',
    'Gerada pela necessidade líquida do Pedido de Venda.'
  )
  returning id,numero_op into v_op_id,v_numero;

  update public.erp_pedidos_venda
  set status='parcial',updated_at=now()
  where id=v_pedido.id and empresa_id=v_empresa;

  return jsonb_build_object('op_id',v_op_id,'numero_op',v_numero,'quantidade',v_falta,'ja_existia',false);
end;
$$;

revoke all on function public.erp_gerar_op_pedido_item(uuid) from public;
grant execute on function public.erp_gerar_op_pedido_item(uuid) to authenticated;
