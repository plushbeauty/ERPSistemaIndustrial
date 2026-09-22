create or replace function public.erp_finalizar_pedido_venda(
  p_cliente_id uuid,
  p_desconto numeric default 0,
  p_itens jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_empresa uuid:=public.erp_current_empresa_id();
  v_pedido uuid;
  v_usuario uuid;
  v_subtotal numeric:=0;
  v_desconto numeric:=greatest(coalesce(p_desconto,0),0);
  v_item jsonb;
  v_produto uuid;
  v_qtd numeric;
  v_preco numeric;
  v_nome text;
begin
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)=0 then raise exception 'A venda precisa ter pelo menos um item.'; end if;

  if p_cliente_id is not null and not exists(
    select 1 from public.erp_clientes c where c.id=p_cliente_id and c.empresa_id=v_empresa and c.ativo=true
  ) then
    raise exception 'Cliente inválido para a empresa atual.';
  end if;

  select u.id into v_usuario
  from public.erp_usuarios u
  where u.auth_user_id=auth.uid() and u.empresa_id=v_empresa and u.ativo=true and u.deleted_at is null
  limit 1;

  insert into public.erp_pedidos_venda(empresa_id,cliente_id,status,total,created_by)
  values(v_empresa,p_cliente_id,'finalizado',0,v_usuario)
  returning id into v_pedido;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto:=nullif(v_item->>'produto_id','')::uuid;
    v_qtd:=(v_item->>'quantidade')::numeric;
    if v_produto is null or v_qtd is null or v_qtd<=0 then
      raise exception 'Item de venda inválido.';
    end if;

    select p.preco_venda,p.nome into v_preco,v_nome
    from public.erp_produtos p
    where p.id=v_produto and p.empresa_id=v_empresa and p.ativo=true
    for update;

    if not found then raise exception 'Produto inválido ou inativo.'; end if;
    if v_qtd>(select coalesce(estoque_atual,0) from public.erp_produtos where id=v_produto and empresa_id=v_empresa)
      then raise exception 'Estoque insuficiente para o produto: %',v_nome;
    end if;

    v_preco:=greatest(coalesce(nullif(v_item->>'valor_unitario','')::numeric,v_preco),0);

    insert into public.erp_pedidos_venda_itens(
      empresa_id,pedido_id,produto_id,descricao,quantidade,valor_unitario,desconto,total
    )
    values(
      v_empresa,v_pedido,v_produto,v_nome,v_qtd,v_preco,0,round(v_qtd*v_preco,2)
    );

    v_subtotal:=v_subtotal+round(v_qtd*v_preco,2);
  end loop;

  if v_desconto>v_subtotal then raise exception 'Desconto não pode ser maior que o subtotal.'; end if;

  update public.erp_pedidos_venda
  set total=round(v_subtotal-v_desconto,2),observacoes=case when v_desconto>0 then 'Desconto adicional: '||v_desconto::text else null end,updated_at=now()
  where id=v_pedido and empresa_id=v_empresa;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_produto:=(v_item->>'produto_id')::uuid;
    v_qtd:=(v_item->>'quantidade')::numeric;
    insert into public.erp_estoque_movimentos(
      empresa_id,produto_id,tipo,quantidade,origem,pedido_venda_id,observacao
    )
    values(
      v_empresa,v_produto,'saida',v_qtd,'venda',v_pedido,'Baixa automática do pedido de venda'
    );
  end loop;

  return v_pedido;
end;
$$;

revoke all on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb) from public,anon;
grant execute on function public.erp_finalizar_pedido_venda(uuid,numeric,jsonb) to authenticated;
