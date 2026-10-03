/* VENDAS — custo industrial e auditoria de margem por item. */
alter table public.erp_pedidos_venda_itens
  add column if not exists preco_custo_industrial numeric(18,6);

create index if not exists idx_erp_pedidos_venda_itens_custo_industrial
  on public.erp_pedidos_venda_itens(empresa_id, produto_id);

create or replace function public.erp_obter_custo_industrial_produto(p_produto_id uuid)
returns numeric
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_ficha uuid;
  v_custo numeric := 0;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not exists (
    select 1 from public.erp_produtos
    where id=p_produto_id and empresa_id=v_empresa and ativo=true
  ) then raise exception 'Produto inválido para a empresa atual.'; end if;

  select f.id into v_ficha
  from public.erp_fichas_processo f
  where f.empresa_id=v_empresa
    and f.produto_id=p_produto_id
    and f.ativo=true
  order by f.updated_at desc,f.created_at desc
  limit 1;

  select round(coalesce(sum((o.tempo_minutos/60.0)*coalesce(m.valor_hora_custo,0)),0),6)
    into v_custo
  from public.erp_ficha_processo_operacoes o
  left join public.erp_maquinas m
    on m.id=o.posto_trabalho_id
   and m.empresa_id=v_empresa
  where o.empresa_id=v_empresa
    and o.ficha_processo_id=v_ficha;

  return coalesce(v_custo,0);
end;
$$;

revoke all on function public.erp_obter_custo_industrial_produto(uuid) from public,anon;
grant execute on function public.erp_obter_custo_industrial_produto(uuid) to authenticated;

create or replace function public.erp_gravar_rascunho_pedido_venda(
  p_pedido_id uuid default null,
  p_cliente_id uuid default null,
  p_itens jsonb default '[]'::jsonb,
  p_data_entrada date default current_date,
  p_data_entrega date default null,
  p_pedido_cliente text default null,
  p_observacoes text default null,
  p_condicao_pagamento text default null,
  p_vendedor_nome text default null,
  p_modalidade_frete text default null,
  p_transportadora_id uuid default null,
  p_via_entrada text default null,
  p_cfop text default null,
  p_forma_pagamento text default null,
  p_desconto numeric default 0,
  p_valor_frete numeric default 0,
  p_valor_outras_despesas numeric default 0
) returns uuid
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid:=public.erp_current_empresa_id();
  v_pedido uuid:=p_pedido_id;
  v_numero bigint;
  v_item jsonb;
  v_produto uuid;
  v_qtd numeric;
  v_preco numeric;
  v_desc numeric;
  v_nome text;
  v_custo numeric;
  v_subtotal numeric:=0;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if p_cliente_id is null or not exists(select 1 from public.erp_clientes where id=p_cliente_id and empresa_id=v_empresa and ativo=true)
    then raise exception 'Cliente inválido para a empresa atual.'; end if;
  if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0
    then raise exception 'O rascunho precisa ter pelo menos um item.'; end if;
  if p_transportadora_id is not null and not exists(select 1 from public.erp_transportadoras where id=p_transportadora_id and empresa_id=v_empresa and ativo=true)
    then raise exception 'Transportadora inválida para a empresa atual.'; end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text));

  if v_pedido is null then
    select coalesce(max(numero),0)+1 into v_numero
    from public.erp_pedidos_venda where empresa_id=v_empresa;

    insert into public.erp_pedidos_venda(
      empresa_id,numero,cliente_id,status,total,subtotal,desconto_valor,valor_frete,valor_outras_despesas,
      data_entrada,data_entrega_prometida,pedido_cliente,observacoes,condicao_pagamento,vendedor_nome,
      modalidade_frete,id_transportadora,via_entrada,cfop,forma_pagamento,created_by
    )
    values(
      v_empresa,v_numero,p_cliente_id,'RASCUNHO',0,0,greatest(coalesce(p_desconto,0),0),
      greatest(coalesce(p_valor_frete,0),0),greatest(coalesce(p_valor_outras_despesas,0),0),
      coalesce(p_data_entrada,current_date),p_data_entrega,nullif(trim(p_pedido_cliente),''),
      nullif(trim(p_observacoes),''),nullif(trim(p_condicao_pagamento),''),nullif(trim(p_vendedor_nome),''),
      nullif(trim(p_modalidade_frete),''),p_transportadora_id,nullif(trim(p_via_entrada),''),
      nullif(trim(p_cfop),''),nullif(trim(p_forma_pagamento),''),auth.uid()
    )
    returning id into v_pedido;
  else
    update public.erp_pedidos_venda set
      cliente_id=p_cliente_id,status='RASCUNHO',data_entrada=coalesce(p_data_entrada,current_date),
      data_entrega_prometida=p_data_entrega,pedido_cliente=nullif(trim(p_pedido_cliente),''),
      observacoes=nullif(trim(p_observacoes),''),condicao_pagamento=nullif(trim(p_condicao_pagamento),''),
      vendedor_nome=nullif(trim(p_vendedor_nome),''),modalidade_frete=nullif(trim(p_modalidade_frete),''),
      id_transportadora=p_transportadora_id,via_entrada=nullif(trim(p_via_entrada),''),cfop=nullif(trim(p_cfop),''),
      forma_pagamento=nullif(trim(p_forma_pagamento),''),desconto_valor=greatest(coalesce(p_desconto,0),0),
      valor_frete=greatest(coalesce(p_valor_frete,0),0),valor_outras_despesas=greatest(coalesce(p_valor_outras_despesas,0),0),
      updated_at=now()
    where id=v_pedido and empresa_id=v_empresa;
    if not found then raise exception 'Rascunho não pertence à empresa atual.'; end if;
    delete from public.erp_pedidos_venda_itens where pedido_id=v_pedido and empresa_id=v_empresa;
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto:=nullif(v_item->>'produto_id','')::uuid;
    v_qtd:=(v_item->>'quantidade')::numeric;
    v_preco:=greatest(coalesce(nullif(v_item->>'valor_unitario','')::numeric,0),0);
    v_desc:=greatest(coalesce(nullif(v_item->>'desconto','')::numeric,0),0);

    select nome into v_nome
    from public.erp_produtos
    where id=v_produto and empresa_id=v_empresa and ativo=true;
    if not found or v_qtd is null or v_qtd<=0 then raise exception 'Item de rascunho inválido.'; end if;

    v_custo:=public.erp_obter_custo_industrial_produto(v_produto);

    insert into public.erp_pedidos_venda_itens(
      empresa_id,pedido_id,produto_id,descricao,quantidade,valor_unitario,desconto,total,produto_cliente,preco_custo_industrial
    )
    values(
      v_empresa,v_pedido,v_produto,v_nome,v_qtd,v_preco,v_desc,
      round(greatest(v_qtd*v_preco-v_desc,0),2),
      nullif(trim(v_item->>'codigo_cliente'),''),
      v_custo
    );

    v_subtotal:=v_subtotal+greatest(round(v_qtd*v_preco-v_desc,2),0);
  end loop;

  if greatest(coalesce(p_desconto,0),0)>v_subtotal then
    raise exception 'Desconto do pedido não pode ser maior que o subtotal.';
  end if;

  update public.erp_pedidos_venda
  set subtotal=round(v_subtotal,2),
      desconto_valor=round(greatest(coalesce(p_desconto,0),0),2),
      total=round(v_subtotal-greatest(coalesce(p_desconto,0),0)+greatest(coalesce(p_valor_frete,0),0)+greatest(coalesce(p_valor_outras_despesas,0),0),2),
      updated_at=now()
  where id=v_pedido and empresa_id=v_empresa;

  return v_pedido;
end;
$$;

revoke all on function public.erp_gravar_rascunho_pedido_venda(uuid,uuid,jsonb,date,date,text,text,text,text,text,uuid,text,text,text,numeric,numeric,numeric) from public,anon;
grant execute on function public.erp_gravar_rascunho_pedido_venda(uuid,uuid,jsonb,date,date,text,text,text,text,text,uuid,text,text,text,numeric,numeric,numeric) to authenticated;

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
  p_transportadora_id uuid default null,
  p_valor_frete numeric default 0,
  p_valor_outras_despesas numeric default 0,
  p_via_entrada text default null,
  p_cfop text default null,
  p_forma_pagamento text default null
) returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid:=public.erp_current_empresa_id();
  v_pedido uuid;
  v_usuario uuid;
  v_numero bigint;
  v_item jsonb;
  v_produto uuid;
  v_qtd numeric;
  v_preco numeric;
  v_desconto_item numeric;
  v_nome text;
  v_custo numeric;
  v_estoque numeric;
  v_reservado numeric;
  v_disponivel numeric;
  v_reserva numeric;
  v_item_id uuid;
  v_subtotal numeric:=0;
  v_desconto numeric:=greatest(coalesce(p_desconto,0),0);
  v_frete numeric:=greatest(coalesce(p_valor_frete,0),0);
  v_outras numeric:=greatest(coalesce(p_valor_outras_despesas,0),0);
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0 then raise exception 'O pedido precisa ter pelo menos um item.'; end if;
  if p_cliente_id is null or not exists(select 1 from public.erp_clientes c where c.id=p_cliente_id and c.empresa_id=v_empresa and c.ativo=true) then raise exception 'Cliente inválido para a empresa atual.'; end if;
  if p_transportadora_id is not null and not exists(select 1 from public.erp_transportadoras t where t.id=p_transportadora_id and t.empresa_id=v_empresa and t.ativo=true) then raise exception 'Transportadora inválida para a empresa atual.'; end if;

  perform pg_advisory_xact_lock(hashtext(v_empresa::text));

  select coalesce(max(numero),0)+1 into v_numero from public.erp_pedidos_venda where empresa_id=v_empresa;
  select u.id into v_usuario from public.erp_usuarios u
  where u.auth_user_id=auth.uid() and u.empresa_id=v_empresa and u.ativo=true and u.deleted_at is null limit 1;

  if v_usuario is null then raise exception 'Usuário ERP não localizado para a empresa atual.'; end if;

  insert into public.erp_pedidos_venda(
    empresa_id,numero,cliente_id,status,total,subtotal,desconto_valor,valor_frete,valor_outras_despesas,
    data_entrada,data_entrega_prometida,pedido_cliente,observacoes,condicao_pagamento,vendedor_nome,
    modalidade_frete,id_transportadora,via_entrada,cfop,forma_pagamento,created_by
  )
  values(
    v_empresa,v_numero,p_cliente_id,'Aguardando Produção',0,0,0,v_frete,v_outras,coalesce(p_data_entrada,current_date),
    p_data_entrega,nullif(trim(p_pedido_cliente),''),nullif(trim(p_observacoes),''),
    nullif(trim(p_condicao_pagamento),''),nullif(trim(p_vendedor_nome),''),
    nullif(trim(p_modalidade_frete),''),p_transportadora_id,nullif(trim(p_via_entrada),''),
    nullif(trim(p_cfop),''),nullif(trim(p_forma_pagamento),''),v_usuario
  ) returning id into v_pedido;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto:=nullif(v_item->>'produto_id','')::uuid;
    v_qtd:=(v_item->>'quantidade')::numeric;
    v_desconto_item:=greatest(coalesce(nullif(v_item->>'desconto','')::numeric,0),0);
    if v_produto is null or v_qtd is null or v_qtd<=0 then raise exception 'Item de pedido inválido.'; end if;

    select p.preco_venda,p.nome,greatest(coalesce(p.estoque_atual,0),0)
      into v_preco,v_nome,v_estoque
    from public.erp_produtos p
    where p.id=v_produto and p.empresa_id=v_empresa and p.ativo=true for update;
    if not found then raise exception 'Produto inválido ou inativo.'; end if;

    select coalesce(sum(r.quantidade),0) into v_reservado
    from public.erp_estoque_reservas r
    where r.empresa_id=v_empresa and r.produto_id=v_produto and r.status='ATIVA';

    v_disponivel:=greatest(v_estoque-v_reservado,0);
    v_reserva:=least(v_qtd,v_disponivel);
    v_preco:=greatest(coalesce(nullif(v_item->>'valor_unitario','')::numeric,v_preco),0);
    v_custo:=public.erp_obter_custo_industrial_produto(v_produto);

    insert into public.erp_pedidos_venda_itens(
      empresa_id,pedido_id,produto_id,descricao,quantidade,valor_unitario,desconto,total,produto_cliente,preco_custo_industrial
    )
    values(
      v_empresa,v_pedido,v_produto,v_nome,v_qtd,v_preco,v_desconto_item,
      round(greatest(v_qtd*v_preco-v_desconto_item,0),2),
      nullif(v_item->>'codigo_cliente',''),v_custo
    ) returning id into v_item_id;

    if v_reserva>0 then
      insert into public.erp_estoque_reservas(empresa_id,pedido_venda_id,pedido_item_id,produto_id,quantidade,status)
      values(v_empresa,v_pedido,v_item_id,v_produto,v_reserva,'ATIVA');
    end if;

    v_subtotal:=v_subtotal+greatest(round(v_qtd*v_preco-v_desconto_item,2),0);
  end loop;

  if v_desconto>v_subtotal then raise exception 'Desconto não pode ser maior que o subtotal.'; end if;

  update public.erp_pedidos_venda
  set subtotal=round(v_subtotal,2),
      desconto_valor=round(v_desconto,2),
      total=round(v_subtotal-v_desconto+v_frete+v_outras,2),
      updated_at=now()
  where id=v_pedido and empresa_id=v_empresa;

  return v_pedido;
end;
$$;

revoke all on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,date,text,text,text,text,text,uuid,numeric,numeric,text,text,text) from public,anon;
grant execute on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb,date,date,text,text,text,text,text,uuid,numeric,numeric,text,text,text) to authenticated;
