-- SYSNQRA ERP INDUSTRIAL — Pedido de compras completo baseado no formulário NewPurchaseOrder.
-- A alteração preserva pedidos existentes e mantém gravação atômica via RPC autenticada.
alter table public.erp_pedidos_compra
  add column if not exists modalidade_frete text,
  add column if not exists transportadora text,
  add column if not exists valor_frete numeric(18,2) not null default 0,
  add column if not exists valor_desconto numeric(18,2) not null default 0,
  add column if not exists numero_contrato text,
  add column if not exists observacoes_recebimento text;

alter table public.erp_pedidos_compra_itens
  add column if not exists ncm text,
  add column if not exists data_entrega_prometida date,
  add column if not exists ordem_producao_id uuid;

create or replace function public.erp_compras_salvar_pedido_completo(
  p_pedido_id uuid,
  p_fornecedor_id uuid,
  p_comprador_nome text,
  p_condicao_pagamento text,
  p_prazo_entrega date,
  p_observacoes text,
  p_status text,
  p_itens jsonb,
  p_dados_comerciais jsonb
)
returns table(id uuid, numero bigint)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_comprador_id uuid;
  v_pedido_id uuid;
  v_numero bigint;
  v_item jsonb;
  v_produto_id uuid;
  v_quantidade numeric;
  v_preco numeric;
  v_unidade text;
  v_aliquota_ipi numeric;
  v_aliquota_icms numeric;
  v_centro_custo text;
  v_produto record;
  v_ncm text;
  v_data_entrega date;
  v_ordem_producao uuid;
  v_centro_custo_pedido text;
  v_local_entrega text;
  v_referencia_cotacao text;
  v_modalidade_frete text;
  v_transportadora text;
  v_valor_frete numeric;
  v_valor_desconto numeric;
  v_numero_contrato text;
  v_observacoes_recebimento text;
  v_total_final numeric(18,2);
begin
  if v_empresa_id is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;
  if p_status not in ('RASCUNHO', 'PENDENTE_APROVACAO') then
    raise exception 'Status de pedido inválido.';
  end if;
  if p_fornecedor_id is null or not exists (
    select 1 from public.erp_fornecedores f
     where f.id = p_fornecedor_id
       and f.empresa_id = v_empresa_id
       and f.ativo = true
  ) then
    raise exception 'Selecione um fornecedor ativo da empresa.';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Inclua pelo menos um produto no pedido.';
  end if;

  select u.id
    into v_comprador_id
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa_id
     and u.ativo = true
     and u.deleted_at is null
   limit 1;
  if v_comprador_id is null then
    raise exception 'Perfil ERP ativo não localizado para registrar o comprador.';
  end if;

  v_centro_custo_pedido := nullif(btrim(p_dados_comerciais->>'centro_custo'), '');
  v_local_entrega := nullif(btrim(p_dados_comerciais->>'local_entrega'), '');
  v_referencia_cotacao := nullif(btrim(p_dados_comerciais->>'referencia_cotacao'), '');
  v_modalidade_frete := nullif(btrim(p_dados_comerciais->>'modalidade_frete'), '');
  v_transportadora := nullif(btrim(p_dados_comerciais->>'transportadora'), '');
  v_valor_frete := coalesce(nullif(p_dados_comerciais->>'valor_frete', '')::numeric, 0);
  v_valor_desconto := coalesce(nullif(p_dados_comerciais->>'valor_desconto', '')::numeric, 0);
  v_numero_contrato := nullif(btrim(p_dados_comerciais->>'numero_contrato'), '');
  v_observacoes_recebimento := nullif(btrim(p_dados_comerciais->>'observacoes_recebimento'), '');
  if v_valor_frete < 0 or v_valor_desconto < 0 then raise exception 'Frete e desconto não podem ser negativos.'; end if;
  if nullif(p_dados_comerciais->>'requisicao_id', '') is not null and not exists (
    select 1 from public.erp_requisicoes_compra r
     where r.id = (p_dados_comerciais->>'requisicao_id')::uuid and r.empresa_id = v_empresa_id
  ) then raise exception 'A requisição selecionada não pertence à empresa ativa.'; end if;

  if p_pedido_id is null then
    if not public.erp_has_permission('compras', 'criar') then
      raise exception 'Sem permissão para criar pedidos de compra.';
    end if;

    insert into public.erp_pedidos_compra (
      empresa_id,
      fornecedor_id,
      comprador_id,
      comprador_nome,
      condicao_pagamento,
      prazo_entrega,
      observacoes,
      status,
      requisicao_id,
      centro_custo,
      local_entrega,
      referencia_cotacao,
      modalidade_frete,
      transportadora,
      valor_frete,
      valor_desconto,
      numero_contrato,
      observacoes_recebimento
    )
    values (
      v_empresa_id,
      p_fornecedor_id,
      v_comprador_id,
      nullif(btrim(p_comprador_nome), ''),
      nullif(btrim(p_condicao_pagamento), ''),
      p_prazo_entrega,
      nullif(btrim(p_observacoes), ''),
      p_status,
      nullif(p_dados_comerciais->>'requisicao_id', '')::uuid,
      v_centro_custo_pedido,
      v_local_entrega,
      v_referencia_cotacao,
      v_modalidade_frete,
      v_transportadora,
      v_valor_frete,
      v_valor_desconto,
      v_numero_contrato,
      v_observacoes_recebimento
    )
    returning erp_pedidos_compra.id, erp_pedidos_compra.numero
         into v_pedido_id, v_numero;
  else
    if not public.erp_has_permission('compras', 'editar') then
      raise exception 'Sem permissão para editar pedidos de compra.';
    end if;

    perform 1
      from public.erp_pedidos_compra p
     where p.id = p_pedido_id
       and p.empresa_id = v_empresa_id
       and p.status in ('RASCUNHO', 'PENDENTE_APROVACAO')
     for update;
    if not found then
      raise exception 'Pedido não encontrado ou não pode mais ser editado.';
    end if;

    update public.erp_pedidos_compra p
       set fornecedor_id = p_fornecedor_id,
           comprador_id = v_comprador_id,
           comprador_nome = nullif(btrim(p_comprador_nome), ''),
           condicao_pagamento = nullif(btrim(p_condicao_pagamento), ''),
           prazo_entrega = p_prazo_entrega,
           observacoes = nullif(btrim(p_observacoes), ''),
           status = p_status,
           requisicao_id = nullif(p_dados_comerciais->>'requisicao_id', '')::uuid,
           centro_custo = v_centro_custo_pedido,
           local_entrega = v_local_entrega,
           referencia_cotacao = v_referencia_cotacao,
           modalidade_frete = v_modalidade_frete,
           transportadora = v_transportadora,
           valor_frete = v_valor_frete,
           valor_desconto = v_valor_desconto,
           numero_contrato = v_numero_contrato,
           observacoes_recebimento = v_observacoes_recebimento,
           updated_at = now()
     where p.id = p_pedido_id
       and p.empresa_id = v_empresa_id
     returning p.id, p.numero into v_pedido_id, v_numero;

    delete from public.erp_pedidos_compra_itens i
     where i.pedido_id = v_pedido_id
       and i.empresa_id = v_empresa_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_produto_id := nullif(v_item->>'produto_id', '')::uuid;
    v_quantidade := nullif(v_item->>'quantidade', '')::numeric;
    v_preco := coalesce(nullif(v_item->>'preco_unitario', '')::numeric, 0);
    v_unidade := coalesce(nullif(btrim(v_item->>'unidade'), ''), 'UN');
    v_aliquota_ipi := coalesce(nullif(v_item->>'aliquota_ipi', '')::numeric, 0);
    v_aliquota_icms := coalesce(nullif(v_item->>'aliquota_icms', '')::numeric, 0);
    v_centro_custo := nullif(btrim(v_item->>'centro_custo'), '');
    v_ncm := nullif(btrim(v_item->>'ncm'), '');
    v_data_entrega := nullif(v_item->>'data_entrega_prometida', '')::date;
    v_ordem_producao := nullif(v_item->>'ordem_producao_id', '')::uuid;

    if v_produto_id is null
      or v_quantidade is null
      or v_quantidade <= 0
      or v_quantidade::text in ('NaN', 'Infinity', '-Infinity')
      or v_preco < 0
      or v_preco::text in ('NaN', 'Infinity', '-Infinity')
      or v_aliquota_ipi < 0 or v_aliquota_ipi > 100
      or v_aliquota_icms < 0 or v_aliquota_icms > 100
      or v_aliquota_ipi::text in ('NaN', 'Infinity', '-Infinity')
      or v_aliquota_icms::text in ('NaN', 'Infinity', '-Infinity')
      or v_ncm is null or length(regexp_replace(v_ncm, '[^0-9]', '', 'g')) not in (8)
      or v_data_entrega is null
      or (v_ordem_producao is not null and not exists (select 1 from public.erp_ordens_producao op where op.id = v_ordem_producao and op.empresa_id = v_empresa_id))
    then
      raise exception 'Item inválido: confira produto, quantidade, preço, NCM com 8 dígitos, data de entrega e OP da empresa.';
    end if;

    select p.id, p.codigo, p.nome
      into v_produto
      from public.erp_produtos p
     where p.id = v_produto_id
       and p.empresa_id = v_empresa_id
       and p.ativo = true;
    if not found then
      raise exception 'Um produto selecionado não pertence à empresa ativa.';
    end if;

    insert into public.erp_pedidos_compra_itens (
      empresa_id,
      pedido_id,
      produto_id,
      codigo_produto,
      descricao_produto,
      quantidade,
      unidade,
      preco_unitario,
      aliquota_ipi,
      aliquota_icms,
      centro_custo,
      ncm,
      data_entrega_prometida,
      ordem_producao_id
    )
    values (
      v_empresa_id,
      v_pedido_id,
      v_produto_id,
      v_produto.codigo,
      v_produto.nome,
      v_quantidade,
      v_unidade,
      v_preco,
      v_aliquota_ipi,
      v_aliquota_icms,
      v_centro_custo,
      v_ncm,
      v_data_entrega,
      v_ordem_producao
    );
  end loop;

  select coalesce(sum(i.total + round(i.total * (i.aliquota_ipi + i.aliquota_icms) / 100, 2)), 0)
    into v_total_final
    from public.erp_pedidos_compra_itens i
   where i.pedido_id = v_pedido_id and i.empresa_id = v_empresa_id;
  update public.erp_pedidos_compra p
     set total = greatest(0, v_total_final + v_valor_frete - v_valor_desconto), updated_at = now()
   where p.id = v_pedido_id and p.empresa_id = v_empresa_id;

  return query select v_pedido_id, v_numero;
end;
$$;


revoke all on function public.erp_compras_salvar_pedido_completo(uuid, uuid, text, text, date, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.erp_compras_salvar_pedido_completo(uuid, uuid, text, text, date, text, text, jsonb, jsonb) to authenticated;
