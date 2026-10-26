-- Pedido de compra: persistir alíquotas fiscais e centro de custo por item.
-- Compatível com pedidos existentes: novas colunas recebem defaults sem alterar registros atuais.
alter table public.erp_pedidos_compra_itens
  add column if not exists aliquota_ipi numeric(9,4) not null default 0,
  add column if not exists aliquota_icms numeric(9,4) not null default 0,
  add column if not exists centro_custo text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'erp_pedidos_compra_itens_aliquota_ipi_range') THEN
    ALTER TABLE public.erp_pedidos_compra_itens ADD CONSTRAINT erp_pedidos_compra_itens_aliquota_ipi_range CHECK (aliquota_ipi BETWEEN 0 AND 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'erp_pedidos_compra_itens_aliquota_icms_range') THEN
    ALTER TABLE public.erp_pedidos_compra_itens ADD CONSTRAINT erp_pedidos_compra_itens_aliquota_icms_range CHECK (aliquota_icms BETWEEN 0 AND 100);
  END IF;
END $$;

create or replace function public.erp_compras_salvar_pedido(
  p_pedido_id uuid,
  p_fornecedor_id uuid,
  p_comprador_nome text,
  p_condicao_pagamento text,
  p_prazo_entrega date,
  p_observacoes text,
  p_status text,
  p_itens jsonb
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
      status
    )
    values (
      v_empresa_id,
      p_fornecedor_id,
      v_comprador_id,
      nullif(btrim(p_comprador_nome), ''),
      nullif(btrim(p_condicao_pagamento), ''),
      p_prazo_entrega,
      nullif(btrim(p_observacoes), ''),
      p_status
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
    then
      raise exception 'Item ou quantidade/preço inválido no pedido.';
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
      centro_custo
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
      v_centro_custo
    );
  end loop;

  return query select v_pedido_id, v_numero;
end;
$$;


revoke all on function public.erp_compras_salvar_pedido(uuid, uuid, text, text, date, text, text, jsonb) from public;
grant execute on function public.erp_compras_salvar_pedido(uuid, uuid, text, text, date, text, text, jsonb) to authenticated;
