alter table public.erp_caixas_movimentos
  add column if not exists idempotency_key uuid,
  add column if not exists request_hash text;

create unique index if not exists erp_caixas_movimentos_empresa_idempotency_uidx
  on public.erp_caixas_movimentos (empresa_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.erp_pdv_finalizar_venda(
  p_caixa_id uuid,
  p_cliente_id uuid,
  p_forma_pagamento text,
  p_desconto numeric,
  p_chave_idempotencia uuid,
  p_itens jsonb
)
returns table (movimento_id uuid, numero bigint, subtotal numeric, total numeric)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_operador uuid;
  v_movimento uuid;
  v_numero bigint;
  v_subtotal numeric := 0;
  v_desconto numeric := coalesce(p_desconto, 0);
  v_total numeric;
  v_request_hash text;
  v_existing_hash text;
  v_forma_pagamento text := upper(btrim(coalesce(p_forma_pagamento, '')));
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade numeric;
  v_preco numeric;
  v_custo numeric;
  v_estoque numeric;
  v_reservado numeric;
  v_nome text;
  v_product record;
begin
  if v_empresa is null or auth.uid() is null then
    raise exception 'Sessão ERP autenticada e empresa ativa são obrigatórias.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('vendas', 'criar')) then
    raise exception 'Sem permissão para finalizar vendas no PDV.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('estoque', 'movimentar')) then
    raise exception 'Sem permissão para movimentar o estoque pelo PDV.' using errcode = '42501';
  end if;
  if p_chave_idempotencia is null then
    raise exception 'Chave de idempotência obrigatória.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' then
    raise exception 'A venda precisa conter uma lista de itens válida.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 500 then
    raise exception 'A venda deve conter entre 1 e 500 itens.' using errcode = '22023';
  end if;
  if v_forma_pagamento = '' then
    raise exception 'Forma de pagamento obrigatória.' using errcode = '22023';
  end if;
  if v_forma_pagamento not in ('DINHEIRO', 'CARTAO', 'PIX') then
    raise exception 'Forma de pagamento não suportada pelo PDV.' using errcode = '22023';
  end if;
  if v_desconto < 0 or v_desconto::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Desconto inválido.' using errcode = '22023';
  end if;

  v_request_hash := md5(jsonb_build_object(
    'caixa_id', p_caixa_id,
    'cliente_id', p_cliente_id,
    'forma_pagamento', v_forma_pagamento,
    'desconto', v_desconto,
    'itens', p_itens
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(v_empresa::text || ':pdv:' || p_chave_idempotencia::text, 0));

  select m.id, m.numero, m.subtotal, m.total, m.request_hash
    into v_movimento, v_numero, v_subtotal, v_total, v_existing_hash
    from public.erp_caixas_movimentos m
   where m.empresa_id = v_empresa
     and m.idempotency_key = p_chave_idempotencia;
  if found then
    if v_existing_hash is distinct from v_request_hash then
      raise exception 'A chave de idempotência já foi usada com outros dados.' using errcode = '22023';
    end if;
    return query select v_movimento, v_numero, v_subtotal, v_total;
    return;
  end if;

  perform 1 from public.erp_caixas c
   where c.id = p_caixa_id
     and c.empresa_id = v_empresa
     and c.ativo = true
   for update;
  if not found then
    raise exception 'Caixa ativo não localizado para a empresa atual.' using errcode = '23503';
  end if;
  if p_cliente_id is not null and not exists (
    select 1 from public.erp_clientes c
     where c.id = p_cliente_id
       and c.empresa_id = v_empresa
       and c.ativo = true
  ) then
    raise exception 'Cliente inativo ou fora da empresa atual.' using errcode = '23503';
  end if;

  select u.id into v_operador
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa
     and u.ativo = true
     and u.deleted_at is null
   limit 1;
  if v_operador is null and not public.erp_is_master() then
    raise exception 'Perfil ERP ativo do operador não localizado.' using errcode = '42501';
  end if;

  insert into public.erp_caixas_movimentos (
    empresa_id, caixa_id, operador_id, cliente_id, subtotal, desconto, total,
    forma_pagamento, status, idempotency_key, request_hash
  )
  values (
    v_empresa, p_caixa_id, v_operador, p_cliente_id, 0, v_desconto, 0,
    v_forma_pagamento, 'FINALIZADA', p_chave_idempotencia, v_request_hash
  )
  returning id, erp_caixas_movimentos.numero
       into v_movimento, v_numero;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_produto_id := nullif(v_item->>'produto_id', '')::uuid;
    v_quantidade := nullif(v_item->>'quantidade', '')::numeric;
    if v_produto_id is null
      or v_quantidade is null
      or v_quantidade <= 0
      or v_quantidade::text in ('NaN', 'Infinity', '-Infinity')
    then
      raise exception 'Produto ou quantidade inválidos no PDV.' using errcode = '22023';
    end if;

    select p.nome, p.preco_venda, p.custo_medio, p.estoque_atual
      into v_product
      from public.erp_produtos p
     where p.id = v_produto_id
       and p.empresa_id = v_empresa
       and p.ativo = true
     for update;
    if not found then
      raise exception 'Produto inativo ou fora da empresa atual.' using errcode = '23503';
    end if;

    v_nome := v_product.nome;
    v_preco := coalesce(v_product.preco_venda, 0);
    v_custo := coalesce(v_product.custo_medio, 0);
    v_estoque := coalesce(v_product.estoque_atual, 0);
    select coalesce(sum(r.quantidade), 0)
      into v_reservado
      from public.erp_estoque_reservas r
     where r.empresa_id = v_empresa
       and r.produto_id = v_produto_id
       and r.status = 'ATIVA';
    if v_quantidade > greatest(v_estoque - v_reservado, 0) then
      raise exception 'Estoque disponível insuficiente para o produto: %.', v_nome using errcode = '23514';
    end if;
    if v_preco < 0 or v_preco::text in ('NaN', 'Infinity', '-Infinity') then
      raise exception 'Preço de venda inválido para o produto: %.', v_nome using errcode = '23514';
    end if;

    insert into public.erp_caixas_movimentos_itens (
      empresa_id, movimento_id, produto_id, descricao, quantidade,
      valor_unitario, desconto, total
    )
    values (
      v_empresa, v_movimento, v_produto_id, v_nome, v_quantidade,
      v_preco, 0, round(v_quantidade * v_preco, 2)
    );

    insert into public.erp_estoque_movimentos (
      empresa_id, produto_id, tipo, quantidade, custo_unitario, origem,
      referencia_id, observacao
    )
    values (
      v_empresa, v_produto_id, 'saida', v_quantidade, v_custo, 'venda',
      v_movimento, 'Baixa automática da venda PDV #' || v_numero::text
    );

    v_subtotal := v_subtotal + round(v_quantidade * v_preco, 2);
  end loop;

  if v_desconto > v_subtotal then
    raise exception 'Desconto não pode ser maior que o subtotal.' using errcode = '22023';
  end if;
  v_total := round(v_subtotal - v_desconto, 2);

  update public.erp_caixas_movimentos m
     set subtotal = v_subtotal,
         total = v_total
   where m.id = v_movimento
     and m.empresa_id = v_empresa;

  return query select v_movimento, v_numero, v_subtotal, v_total;
end;
$$;

revoke all on function public.erp_pdv_finalizar_venda(uuid, uuid, text, numeric, uuid, jsonb) from public, anon;
grant execute on function public.erp_pdv_finalizar_venda(uuid, uuid, text, numeric, uuid, jsonb) to authenticated;
