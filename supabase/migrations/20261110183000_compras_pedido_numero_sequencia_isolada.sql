-- Corrige a numeração: a sequência de Compras considera exclusivamente erp_pedidos_compra por empresa.
-- SECURITY INVOKER, RLS e FKs existentes permanecem inalterados.
CREATE OR REPLACE FUNCTION public.erp_compras_salvar_pedido(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_empresa_policy_id uuid := public.erp_current_company_id();
  v_user_id uuid := auth.uid();
  v_usuario_id uuid;
  v_pedido_id uuid;
  v_numero bigint;
  v_status text;
  v_fornecedor_id uuid;
  v_requisicao_id uuid;
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade numeric;
  v_valor_unitario numeric;
  v_total_item numeric;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_qtd_total numeric := 0;
  v_primeiro_produto uuid;
  v_primeiro_valor numeric := 0;
  v_primeira_descricao text;
  v_codigo text;
  v_descricao text;
  v_unidade text;
  v_data_prevista date;
  v_data_necessidade date;
  v_nivel_urgencia text;
  v_existing boolean := false;
begin
  if v_user_id is null then
    raise exception 'Sessão autenticada obrigatória.';
  end if;
  if v_empresa_id is null or v_empresa_policy_id is distinct from v_empresa_id then
    raise exception 'Empresa ativa não identificada ou contexto de tenant inconsistente.';
  end if;
  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Payload do pedido inválido.';
  end if;

  v_fornecedor_id := nullif(p_payload->>'fornecedor_id','')::uuid;
  v_requisicao_id := nullif(p_payload->>'requisicao_id','')::uuid;
  v_status := upper(coalesce(nullif(btrim(p_payload->>'status'),''),'RASCUNHO'));
  v_data_prevista := nullif(p_payload->>'data_prevista','')::date;
  v_data_necessidade := nullif(p_payload->>'data_necessidade','')::date;
  v_nivel_urgencia := upper(coalesce(nullif(btrim(p_payload->>'nivel_urgencia'),''),'NORMAL'));

  if v_status not in ('RASCUNHO','PENDENTE_APROVACAO') then
    raise exception 'Status inicial inválido. Use RASCUNHO ou PENDENTE_APROVACAO.';
  end if;
  if v_nivel_urgencia not in ('BAIXA','NORMAL','MEDIA','ALTA','CRITICA') then
    raise exception 'Nível de urgência inválido.';
  end if;
  if v_fornecedor_id is null or not exists (
    select 1 from public.erp_fornecedores f
     where f.id = v_fornecedor_id and f.empresa_id = v_empresa_id and f.ativo = true
  ) then
    raise exception 'Fornecedor não pertence à empresa ativa ou está inativo.';
  end if;
  if v_requisicao_id is not null and not exists (
    select 1 from public.erp_requisicoes_compra r
     where r.id = v_requisicao_id and r.empresa_id = v_empresa_id
  ) then
    raise exception 'Requisição não pertence à empresa ativa.';
  end if;
  if jsonb_typeof(p_payload->'itens') is distinct from 'array'
     or jsonb_array_length(p_payload->'itens') = 0 then
    raise exception 'Inclua ao menos um item no pedido.';
  end if;

  if not public.erp_has_permission('compras', case
      when nullif(p_payload->>'pedido_id','') is null then 'criar'
      else 'editar' end) then
    raise exception 'Usuário sem permissão para esta operação de compras.';
  end if;

  select u.id into v_usuario_id
    from public.erp_usuarios u
   where u.auth_user_id = v_user_id
     and u.empresa_id = v_empresa_id
     and u.ativo = true
     and u.deleted_at is null
   limit 1;
  if v_usuario_id is null then
    raise exception 'Usuário ERP ativo não localizado na empresa autenticada.';
  end if;

  -- Serializa a numeração por empresa, sem usar sequências de outros módulos.
  perform pg_advisory_xact_lock(hashtext('pc_' || v_empresa_id::text));

  v_pedido_id := nullif(p_payload->>'pedido_id','')::uuid;
  if v_pedido_id is not null then
    perform 1 from public.erp_pedidos_compra pc
     where pc.id = v_pedido_id and pc.empresa_id = v_empresa_id
       and pc.status in ('RASCUNHO','PENDENTE_APROVACAO')
     for update;
    if not found then
      raise exception 'Pedido não encontrado ou não editável nesta empresa.';
    end if;
    perform 1 from public.erp_pedidos pm
     where pm.id = v_pedido_id and pm.empresa_id = v_empresa_id
     for update;
    if not found then
      raise exception 'Pedido legado sem vínculo mestre compatível; edição preservada e bloqueada.';
    end if;
    v_existing := true;
    select pc.numero into v_numero
      from public.erp_pedidos_compra pc
     where pc.id = v_pedido_id and pc.empresa_id = v_empresa_id;
  else
    select coalesce(max(pc.numero),0) + 1
      into v_numero
      from public.erp_pedidos_compra pc
     where pc.empresa_id = v_empresa_id;
    v_pedido_id := gen_random_uuid();

    insert into public.erp_pedidos
      (id, empresa_id, numero_pedido, parceiro_id, valor_total, status)
    values
      (v_pedido_id, v_empresa_id, v_numero::text, null, 0, v_status);
  end if;

  for v_item in select value from jsonb_array_elements(p_payload->'itens')
  loop
    v_produto_id := nullif(v_item->>'produto_id','')::uuid;
    v_quantidade := nullif(v_item->>'quantidade','')::numeric;
    v_valor_unitario := coalesce(nullif(v_item->>'valor_unitario','')::numeric,0);
    v_unidade := coalesce(nullif(btrim(v_item->>'unidade'),''),'UN');
    if v_produto_id is null or v_quantidade is null or v_quantidade <= 0
       or v_valor_unitario < 0
       or v_quantidade::text in ('NaN','Infinity','-Infinity')
       or v_valor_unitario::text in ('NaN','Infinity','-Infinity') then
      raise exception 'Item com produto, quantidade ou valor unitário inválido.';
    end if;

    select p.codigo,p.nome into v_codigo,v_descricao
      from public.erp_produtos p
     where p.id = v_produto_id and p.empresa_id = v_empresa_id and p.ativo = true;
    if not found then
      raise exception 'Produto inválido ou pertencente a outra empresa.';
    end if;

    v_total_item := round(v_quantidade * v_valor_unitario,2);
    v_subtotal := v_subtotal + v_total_item;
    v_qtd_total := v_qtd_total + v_quantidade;
    if v_primeiro_produto is null then
      v_primeiro_produto := v_produto_id;
      v_primeiro_valor := v_valor_unitario;
      v_primeira_descricao := v_descricao;
    end if;
  end loop;

  v_total := round(v_subtotal,2);

  if v_existing then
    update public.erp_pedidos
       set valor_total = v_total, status = v_status
     where id = v_pedido_id and empresa_id = v_empresa_id;
    update public.erp_pedidos_compra
       set fornecedor_id = v_fornecedor_id,
           produto_id = v_primeiro_produto,
           quantidade = v_qtd_total,
           valor_unitario = v_primeiro_valor,
           total = v_total,
           status = v_status,
           data_prevista = v_data_prevista,
           observacoes = nullif(btrim(p_payload->>'observacoes'),''),
           comentarios = nullif(btrim(p_payload->>'comentarios'),''),
           condicao_pagamento = nullif(btrim(p_payload->>'condicao_pagamento'),''),
           armazem_destino = nullif(btrim(p_payload->>'local_entrega'),''),
           requisicao_id = v_requisicao_id,
           comprador_id = v_usuario_id,
           centro_custo = nullif(btrim(p_payload->>'centro_custo'),''),
           local_entrega = nullif(btrim(p_payload->>'local_entrega'),''),
           referencia_cotacao = nullif(btrim(p_payload->>'referencia_cotacao'),''),
           especificacao_tecnica = nullif(btrim(p_payload->>'especificacao_tecnica'),''),
           updated_at = now()
     where id = v_pedido_id and empresa_id = v_empresa_id;
    delete from public.erp_pedidos_compra_itens i
     where i.pedido_id = v_pedido_id and i.empresa_id = v_empresa_id;
  else
    insert into public.erp_pedidos_compra
      (id, empresa_id, fornecedor_id, produto_id, quantidade, valor_unitario, total,
       status, data_prevista, observacoes, numero, origem_solicitacao, data_necessidade,
       nivel_urgencia, solicitado_por, comentarios, condicao_pagamento, armazem_destino,
       requisicao_id, comprador_id, centro_custo, local_entrega, referencia_cotacao,
       especificacao_tecnica)
    values
      (v_pedido_id, v_empresa_id, v_fornecedor_id, v_primeiro_produto, v_qtd_total,
       v_primeiro_valor, v_total, v_status, v_data_prevista,
       nullif(btrim(p_payload->>'observacoes'),''), v_numero,
       coalesce(nullif(upper(btrim(p_payload->>'origem_solicitacao')),''),'INTERNO'),
       v_data_necessidade, v_nivel_urgencia, v_usuario_id,
       nullif(btrim(p_payload->>'comentarios'),''),
       nullif(btrim(p_payload->>'condicao_pagamento'),''),
       nullif(btrim(p_payload->>'local_entrega'),''),
       v_requisicao_id, v_usuario_id,
       nullif(btrim(p_payload->>'centro_custo'),''),
       nullif(btrim(p_payload->>'local_entrega'),''),
       nullif(btrim(p_payload->>'referencia_cotacao'),''),
       nullif(btrim(p_payload->>'especificacao_tecnica'),''));
  end if;

  -- Segunda passagem: grava os itens usando a chave mestre exigida pela FK real.
  for v_item in select value from jsonb_array_elements(p_payload->'itens')
  loop
    v_produto_id := nullif(v_item->>'produto_id','')::uuid;
    v_quantidade := nullif(v_item->>'quantidade','')::numeric;
    v_valor_unitario := coalesce(nullif(v_item->>'valor_unitario','')::numeric,0);
    v_unidade := coalesce(nullif(btrim(v_item->>'unidade'),''),'UN');
    select p.codigo,p.nome into v_codigo,v_descricao
      from public.erp_produtos p
     where p.id = v_produto_id and p.empresa_id = v_empresa_id and p.ativo = true;
    insert into public.erp_pedidos_compra_itens
      (empresa_id,pedido_id,produto_id,descricao,quantidade,valor_unitario,total,codigo_mp,unidade,
       cliente_interno,data_necessidade,nivel_urgencia,observacoes)
    values
      (v_empresa_id,v_pedido_id,v_produto_id,
       coalesce(nullif(btrim(v_item->>'descricao'),''),v_descricao),
       v_quantidade,v_valor_unitario,round(v_quantidade*v_valor_unitario,2),
       coalesce(nullif(btrim(v_item->>'codigo_mp'),''),v_codigo),v_unidade,
       nullif(btrim(v_item->>'cliente_interno'),''),
       nullif(v_item->>'data_necessidade','')::date,
       upper(coalesce(nullif(btrim(v_item->>'nivel_urgencia'),''),v_nivel_urgencia)),
       nullif(btrim(v_item->>'observacoes'),''));
  end loop;

  if v_existing then
    update public.erp_pedidos
       set valor_total = v_total
     where id = v_pedido_id and empresa_id = v_empresa_id;
  else
    update public.erp_pedidos
       set valor_total = v_total
     where id = v_pedido_id and empresa_id = v_empresa_id;
  end if;

  return jsonb_build_object(
    'pedido_id',v_pedido_id,
    'pedido_compra_id',v_pedido_id,
    'numero_pedido',v_numero
  );
end;
$function$

