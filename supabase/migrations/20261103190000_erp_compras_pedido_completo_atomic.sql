-- SYSNQRA ERP INDUSTRIAL
-- Pedido de compra completo: grava cabecalho, dados comerciais e itens em uma unica transacao.
-- A RPC valida tenant, referencias e permissao no banco; nao depende de validacao do navegador.

alter table public.erp_pedidos_compra
  add column if not exists centro_custo text,
  add column if not exists local_entrega text,
  add column if not exists referencia_cotacao text,
  add column if not exists valor_frete numeric(18,2) not null default 0,
  add column if not exists valor_desconto numeric(18,2) not null default 0,
  add column if not exists transportadora text,
  add column if not exists modalidade_frete text,
  add column if not exists numero_contrato text,
  add column if not exists observacoes_recebimento text;

alter table public.erp_pedidos_compra_itens
  add column if not exists ncm text,
  add column if not exists data_entrega_prometida date,
  add column if not exists ordem_producao_id uuid,
  add column if not exists aliquota_ipi numeric(9,4) not null default 0,
  add column if not exists aliquota_icms numeric(9,4) not null default 0,
  add column if not exists centro_custo text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'erp_pedidos_compra_itens_ordem_producao_fk') then
    alter table public.erp_pedidos_compra_itens
      add constraint erp_pedidos_compra_itens_ordem_producao_fk
      foreign key (ordem_producao_id) references public.erp_ordens_producao(id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'erp_pedidos_compra_itens_aliquota_ipi_range') then
    alter table public.erp_pedidos_compra_itens
      add constraint erp_pedidos_compra_itens_aliquota_ipi_range check (aliquota_ipi between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'erp_pedidos_compra_itens_aliquota_icms_range') then
    alter table public.erp_pedidos_compra_itens
      add constraint erp_pedidos_compra_itens_aliquota_icms_range check (aliquota_icms between 0 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'erp_pedidos_compra_valores_comerciais_nonnegative') then
    alter table public.erp_pedidos_compra
      add constraint erp_pedidos_compra_valores_comerciais_nonnegative
      check (valor_frete >= 0 and valor_desconto >= 0);
  end if;
end $$;

create or replace function public.erp_compras_salvar_pedido_completo(
  p_pedido_id uuid,
  p_fornecedor_id uuid,
  p_comprador_nome text,
  p_condicao_pagamento text,
  p_prazo_entrega date,
  p_observacoes text,
  p_status text,
  p_itens jsonb,
  p_dados_comerciais jsonb default '{}'::jsonb
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
  v_ipi numeric;
  v_icms numeric;
  v_centro_custo text;
  v_ncm text;
  v_entrega_item date;
  v_op_id uuid;
  v_produto record;
  v_requisicao_id uuid;
  v_frete numeric := 0;
  v_desconto numeric := 0;
  v_subtotal numeric := 0;
  v_impostos numeric := 0;
  v_total numeric := 0;
  v_modalidade text;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória.';
  end if;
  if v_empresa_id is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;
  if p_status not in ('RASCUNHO', 'PENDENTE_APROVACAO') then
    raise exception 'Status inicial inválido para criação/edição de pedido.';
  end if;
  if p_fornecedor_id is null or not exists (
    select 1 from public.erp_fornecedores f
     where f.id = p_fornecedor_id and f.empresa_id = v_empresa_id and f.ativo = true
  ) then
    raise exception 'Selecione um fornecedor ativo da empresa.';
  end if;
  if nullif(btrim(coalesce(p_condicao_pagamento, '')), '') is null then
    raise exception 'Informe a condição de pagamento.';
  end if;
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Inclua pelo menos um item no pedido.';
  end if;
  if jsonb_typeof(coalesce(p_dados_comerciais, '{}'::jsonb)) is distinct from 'object' then
    raise exception 'Dados comerciais inválidos.';
  end if;

  if not public.erp_has_permission('compras', case when p_pedido_id is null then 'criar' else 'editar' end) then
    raise exception 'Usuário sem permissão para esta operação de compras.';
  end if;

  select u.id into v_comprador_id
    from public.erp_usuarios u
   where u.auth_user_id = auth.uid()
     and u.empresa_id = v_empresa_id
     and u.ativo = true
     and u.deleted_at is null
   limit 1;
  if v_comprador_id is null then
    raise exception 'Perfil ERP ativo não localizado para registrar o comprador.';
  end if;

  v_requisicao_id := nullif(p_dados_comerciais->>'requisicao_id', '')::uuid;
  v_frete := coalesce(nullif(p_dados_comerciais->>'valor_frete', '')::numeric, 0);
  v_desconto := coalesce(nullif(p_dados_comerciais->>'valor_desconto', '')::numeric, 0);
  v_modalidade := upper(coalesce(nullif(btrim(p_dados_comerciais->>'modalidade_frete'), ''), 'CIF'));
  if v_frete < 0 or v_desconto < 0 or v_frete::text in ('NaN','Infinity','-Infinity') or v_desconto::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Frete e desconto devem ser valores não negativos.';
  end if;
  if v_modalidade not in ('CIF','FOB') then
    raise exception 'Modalidade de frete inválida.';
  end if;
  if v_requisicao_id is not null and not exists (
    select 1 from public.erp_requisicoes_compra r
     where r.id = v_requisicao_id and r.empresa_id = v_empresa_id
  ) then
    raise exception 'A requisição selecionada não pertence à empresa ativa.';
  end if;

  if p_pedido_id is null then
    insert into public.erp_pedidos_compra (
      empresa_id, fornecedor_id, requisicao_id, comprador_id, comprador_nome,
      condicao_pagamento, prazo_entrega, observacoes, status,
      centro_custo, local_entrega, referencia_cotacao, valor_frete,
      valor_desconto, transportadora, modalidade_frete, numero_contrato,
      observacoes_recebimento
    ) values (
      v_empresa_id, p_fornecedor_id, v_requisicao_id, v_comprador_id,
      nullif(btrim(p_comprador_nome), ''), nullif(btrim(p_condicao_pagamento), ''),
      p_prazo_entrega, nullif(btrim(p_observacoes), ''), p_status,
      nullif(btrim(p_dados_comerciais->>'centro_custo'), ''),
      nullif(btrim(p_dados_comerciais->>'local_entrega'), ''),
      nullif(btrim(p_dados_comerciais->>'referencia_cotacao'), ''),
      v_frete, v_desconto,
      nullif(btrim(p_dados_comerciais->>'transportadora'), ''),
      v_modalidade,
      nullif(btrim(p_dados_comerciais->>'numero_contrato'), ''),
      nullif(btrim(p_dados_comerciais->>'observacoes_recebimento'), '')
    ) returning erp_pedidos_compra.id, erp_pedidos_compra.numero into v_pedido_id, v_numero;
  else
    perform 1 from public.erp_pedidos_compra p
     where p.id = p_pedido_id and p.empresa_id = v_empresa_id
       and p.status in ('RASCUNHO','PENDENTE_APROVACAO')
     for update;
    if not found then
      raise exception 'Pedido não encontrado ou bloqueado para edição.';
    end if;
    update public.erp_pedidos_compra p
       set fornecedor_id = p_fornecedor_id,
           requisicao_id = v_requisicao_id,
           comprador_id = v_comprador_id,
           comprador_nome = nullif(btrim(p_comprador_nome), ''),
           condicao_pagamento = nullif(btrim(p_condicao_pagamento), ''),
           prazo_entrega = p_prazo_entrega,
           observacoes = nullif(btrim(p_observacoes), ''),
           status = p_status,
           centro_custo = nullif(btrim(p_dados_comerciais->>'centro_custo'), ''),
           local_entrega = nullif(btrim(p_dados_comerciais->>'local_entrega'), ''),
           referencia_cotacao = nullif(btrim(p_dados_comerciais->>'referencia_cotacao'), ''),
           valor_frete = v_frete,
           valor_desconto = v_desconto,
           transportadora = nullif(btrim(p_dados_comerciais->>'transportadora'), ''),
           modalidade_frete = v_modalidade,
           numero_contrato = nullif(btrim(p_dados_comerciais->>'numero_contrato'), ''),
           observacoes_recebimento = nullif(btrim(p_dados_comerciais->>'observacoes_recebimento'), ''),
           updated_at = now()
     where p.id = p_pedido_id and p.empresa_id = v_empresa_id
     returning p.id, p.numero into v_pedido_id, v_numero;
    delete from public.erp_pedidos_compra_itens i
     where i.pedido_id = v_pedido_id and i.empresa_id = v_empresa_id;
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_produto_id := nullif(v_item->>'produto_id', '')::uuid;
    v_quantidade := nullif(v_item->>'quantidade', '')::numeric;
    v_preco := coalesce(nullif(v_item->>'preco_unitario', '')::numeric, 0);
    v_ipi := coalesce(nullif(v_item->>'aliquota_ipi', '')::numeric, 0);
    v_icms := coalesce(nullif(v_item->>'aliquota_icms', '')::numeric, 0);
    v_centro_custo := nullif(btrim(v_item->>'centro_custo'), '');
    v_ncm := nullif(btrim(v_item->>'ncm'), '');
    v_entrega_item := nullif(v_item->>'data_entrega_prometida', '')::date;
    v_op_id := nullif(v_item->>'ordem_producao_id', '')::uuid;

    if v_produto_id is null or v_quantidade is null or v_quantidade <= 0
       or v_preco < 0 or v_ipi < 0 or v_ipi > 100 or v_icms < 0 or v_icms > 100
       or v_quantidade::text in ('NaN','Infinity','-Infinity')
       or v_preco::text in ('NaN','Infinity','-Infinity')
       or v_ipi::text in ('NaN','Infinity','-Infinity')
       or v_icms::text in ('NaN','Infinity','-Infinity') then
      raise exception 'Item com produto, quantidade, preço ou alíquota inválidos.';
    end if;
    if v_ncm is null or v_ncm = '' then
      raise exception 'Informe o NCM de cada item.';
    end if;

    select p.id, p.codigo, p.nome into v_produto
      from public.erp_produtos p
     where p.id = v_produto_id and p.empresa_id = v_empresa_id and p.ativo = true;
    if not found then
      raise exception 'Produto não pertence à empresa ativa ou está inativo.';
    end if;
    if v_op_id is not null and not exists (
      select 1 from public.erp_ordens_producao op
       where op.id = v_op_id and op.empresa_id = v_empresa_id
    ) then
      raise exception 'A ordem de produção selecionada não pertence à empresa ativa.';
    end if;

    insert into public.erp_pedidos_compra_itens (
      empresa_id, pedido_id, produto_id, codigo_produto, descricao_produto,
      quantidade, unidade, preco_unitario, aliquota_ipi, aliquota_icms,
      centro_custo, ncm, data_entrega_prometida, ordem_producao_id
    ) values (
      v_empresa_id, v_pedido_id, v_produto_id, v_produto.codigo, v_produto.nome,
      v_quantidade, coalesce(nullif(btrim(v_item->>'unidade'), ''), 'UN'),
      v_preco, v_ipi, v_icms, coalesce(v_centro_custo, nullif(btrim(p_dados_comerciais->>'centro_custo'), '')),
      v_ncm, v_entrega_item, v_op_id
    );

    v_subtotal := v_subtotal + (v_quantidade * v_preco);
    v_impostos := v_impostos + (v_quantidade * v_preco * (v_ipi + v_icms) / 100);
  end loop;

  v_total := greatest(0, round(v_subtotal + v_impostos + v_frete - v_desconto, 2));
  update public.erp_pedidos_compra p
     set total = v_total, updated_at = now()
   where p.id = v_pedido_id and p.empresa_id = v_empresa_id;

  return query select v_pedido_id, v_numero;
end;
$$;

revoke all on function public.erp_compras_salvar_pedido_completo(uuid, uuid, text, text, date, text, text, jsonb, jsonb) from public;
grant execute on function public.erp_compras_salvar_pedido_completo(uuid, uuid, text, text, date, text, text, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
