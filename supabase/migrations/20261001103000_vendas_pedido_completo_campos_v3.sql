/*
  VENDAS — Pedido completo v3
  Campos comerciais completos e fluxo Pedido -> Reserva -> PCP.
  Reserva não reduz estoque físico.
*/
alter table public.erp_pedidos_venda
  add column if not exists data_entrada date not null default current_date,
  add column if not exists condicao_pagamento text,
  add column if not exists vendedor_nome text,
  add column if not exists modalidade_frete text,
  add column if not exists transportadora text,
  add column if not exists subtotal numeric(18,2) not null default 0,
  add column if not exists desconto_valor numeric(18,2) not null default 0,
  add column if not exists valor_frete numeric(18,2) not null default 0,
  add column if not exists valor_outras_despesas numeric(18,2) not null default 0;

create index if not exists idx_erp_pedidos_venda_empresa_data_entrada
  on public.erp_pedidos_venda(empresa_id,data_entrada desc);

drop function if exists public.erp_finalizar_pedido_venda(uuid,numeric,jsonb);

create or replace function public.erp_finalizar_pedido_venda(
  p_cliente_id uuid,
  p_desconto numeric default 0,
  p_itens jsonb default '[]'::jsonb,
  p_data_entrada date default current_date,
  p_data_entrega date default null,
  p_pedido_cliente text default null,
  p_observacoes text default null,
  p_condicao_pagamento text default null,
  p_vendedor_nome text default null,
  p_modalidade_frete text default null,
  p_transportadora text default null,
  p_valor_frete numeric default 0,
  p_valor_outras_despesas numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_pedido uuid;
  v_usuario uuid;
  v_numero bigint;
  v_item jsonb;
  v_produto uuid;
  v_qtd numeric;
  v_preco numeric;
  v_desconto_item numeric;
  v_nome text;
  v_estoque numeric;
  v_reservado numeric;
  v_disponivel numeric;
  v_reserva numeric;
  v_falta numeric;
  v_item_id uuid;
  v_subtotal numeric := 0;
  v_desconto numeric := greatest(coalesce(p_desconto,0),0);
  v_frete numeric := greatest(coalesce(p_valor_frete,0),0);
  v_outras numeric := greatest(coalesce(p_valor_outras_despesas,0),0);
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0 then raise exception 'O pedido precisa ter pelo menos um item.'; end if;
  if p_cliente_id is null or not exists(
    select 1 from public.erp_clientes c
    where c.id=p_cliente_id and c.empresa_id=v_empresa and c.ativo=true
  ) then
    raise exception 'Cliente inválido para a empresa atual.';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text));

  select coalesce(max(numero),0)+1 into v_numero
  from public.erp_pedidos_venda where empresa_id=v_empresa;

  select u.id into v_usuario
  from public.erp_usuarios u
  where u.auth_user_id=auth.uid() and u.empresa_id=v_empresa
    and u.ativo=true and u.deleted_at is null limit 1;

  insert into public.erp_pedidos_venda(
    empresa_id,numero,cliente_id,status,total,subtotal,desconto_valor,
    valor_frete,valor_outras_despesas,data_entrada,data_entrega_prometida,
    pedido_cliente,observacoes,condicao_pagamento,vendedor_nome,
    modalidade_frete,transportadora,created_by
  )
  values(
    v_empresa,v_numero,p_cliente_id,'PENDENTE',0,0,0,v_frete,v_outras,
    coalesce(p_data_entrada,current_date),p_data_entrega,
    nullif(trim(p_pedido_cliente),''),nullif(trim(p_observacoes),''),
    nullif(trim(p_condicao_pagamento),''),nullif(trim(p_vendedor_nome),''),
    nullif(trim(p_modalidade_frete),''),nullif(trim(p_transportadora),''),v_usuario
  )
  returning id into v_pedido;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto := nullif(v_item->>'produto_id','')::uuid;
    v_qtd := (v_item->>'quantidade')::numeric;
    v_desconto_item := greatest(coalesce(nullif(v_item->>'desconto','')::numeric,0),0);

    if v_produto is null or v_qtd is null or v_qtd<=0 then
      raise exception 'Item de pedido inválido.';
    end if;

    select p.preco_venda,p.nome,greatest(coalesce(p.estoque_atual,0),0)
      into v_preco,v_nome,v_estoque
    from public.erp_produtos p
    where p.id=v_produto and p.empresa_id=v_empresa and p.ativo=true
    for update;

    if not found then raise exception 'Produto inválido ou inativo.'; end if;

    select coalesce(sum(r.quantidade),0) into v_reservado
    from public.erp_estoque_reservas r
    where r.empresa_id=v_empresa and r.produto_id=v_produto and r.status='ATIVA';

    v_disponivel := greatest(v_estoque-v_reservado,0);
    v_reserva := least(v_qtd,v_disponivel);
    v_falta := greatest(v_qtd-v_reserva,0);
    v_preco := greatest(coalesce(nullif(v_item->>'valor_unitario','')::numeric,v_preco),0);

    insert into public.erp_pedidos_venda_itens(
      empresa_id,pedido_id,produto_id,descricao,quantidade,
      valor_unitario,desconto,total,produto_cliente
    )
    values(
      v_empresa,v_pedido,v_produto,v_nome,v_qtd,v_preco,v_desconto_item,
      round(greatest(v_qtd*v_preco-v_desconto_item,0),2),
      nullif(trim(v_item->>'codigo_cliente'),'')
    )
    returning id into v_item_id;

    if v_reserva>0 then
      insert into public.erp_estoque_reservas(
        empresa_id,pedido_venda_id,pedido_item_id,produto_id,quantidade,status
      ) values(v_empresa,v_pedido,v_item_id,v_produto,v_reserva,'ATIVA');
    end if;

    if v_falta>0 then
      insert into public.erp_ordens_producao(
        empresa_id,numero_op,produto_id,quantidade,status,pedido_venda_id,
        data_prevista,observacoes,cliente_id,quantidade_planejada
      )
      values(
        v_empresa,'OP-'||v_numero||'-'||replace(coalesce(v_item->>'codigo','ITEM'),'/','-'),
        v_produto,v_falta,'Aguardando PCP',v_pedido,p_data_entrega,
        'Gerada automaticamente pelo Pedido de Venda. Necessidade líquida após reserva de estoque.',
        p_cliente_id,v_falta
      );
    end if;

    v_subtotal := v_subtotal + greatest(round(v_qtd*v_preco-v_desconto_item,2),0);
  end loop;

  if v_desconto>v_subtotal then
    raise exception 'Desconto do pedido não pode ser maior que o subtotal.';
  end if;

  update public.erp_pedidos_venda
  set subtotal=round(v_subtotal,2),
      desconto_valor=round(v_desconto,2),
      total=round(v_subtotal-v_desconto+v_frete+v_outras,2),
      updated_at=now()
  where id=v_pedido and empresa_id=v_empresa;

  return v_pedido;
end;
$$;

revoke all on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,date,text,text,text,text,text,text,numeric,numeric) from public,anon;
grant execute on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,date,text,text,text,text,text,text,numeric,numeric) to authenticated;
