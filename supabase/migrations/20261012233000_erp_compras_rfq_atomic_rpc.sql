-- RFQ creation is atomic: header, suppliers and items commit together.
-- Authorization is enforced inside PostgreSQL and is independent of UI visibility.
begin;

create or replace function public.erp_compras_criar_rfq_atomica(
  p_fornecedor_ids uuid[],
  p_itens jsonb,
  p_prazo_resposta date default null,
  p_condicao_pagamento text default null,
  p_observacoes text default null,
  p_data_necessidade date default null
)
returns table(id uuid, numero bigint)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_rfq_id uuid;
  v_numero bigint;
  v_fornecedor_id uuid;
  v_item jsonb;
  v_produto_id uuid;
  v_codigo text;
  v_descricao text;
  v_quantidade numeric(18,4);
  v_unidade text;
  v_data_necessidade date;
  v_observacoes_item text;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.';
  end if;
  if v_empresa_id is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('compras','criar')) then
    raise exception 'Sem permissão para criar cotações de compras.';
  end if;
  if not exists (
    select 1 from public.erp_usuarios u
    where u.id = auth.uid() and u.empresa_id = v_empresa_id and u.ativo = true
  ) and not public.erp_is_master() then
    raise exception 'Perfil ERP ativo não localizado para a empresa da sessão.';
  end if;
  if coalesce(cardinality(p_fornecedor_ids), 0) = 0 then
    raise exception 'Selecione ao menos um fornecedor.';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Inclua ao menos um item na cotação.';
  end if;
  if p_prazo_resposta is not null and p_prazo_resposta < current_date then
    raise exception 'O prazo de resposta não pode estar no passado.';
  end if;

  -- Validate all related records before inserting the RFQ header.
  for v_fornecedor_id in select distinct unnest(p_fornecedor_ids) loop
    if not exists (
      select 1 from public.erp_fornecedores f
      where f.id = v_fornecedor_id and f.empresa_id = v_empresa_id and f.ativo = true
    ) then
      raise exception 'Fornecedor inválido, inativo ou pertencente a outra empresa.';
    end if;
  end loop;

  for v_item in select value from jsonb_array_elements(p_itens) loop
    begin
      v_produto_id := nullif(v_item->>'produto_id','')::uuid;
      v_quantidade := nullif(v_item->>'quantidade','')::numeric;
      v_codigo := nullif(trim(v_item->>'codigo'),'');
      v_descricao := nullif(trim(v_item->>'descricao'),'');
      v_unidade := coalesce(nullif(trim(v_item->>'unidade'),''),'UN');
      v_data_necessidade := nullif(v_item->>'data_necessidade','')::date;
      v_observacoes_item := nullif(trim(v_item->>'observacoes'),'');
    exception when others then
      raise exception 'Dados inválidos em um dos itens da cotação.';
    end;
    if v_produto_id is null or v_quantidade is null or v_quantidade <= 0
      or v_codigo is null or v_descricao is null then
      raise exception 'Cada item precisa de produto, código, descrição e quantidade maior que zero.';
    end if;
    if not exists (
      select 1 from public.erp_produtos p
      where p.id = v_produto_id and p.empresa_id = v_empresa_id and p.ativo = true
    ) then
      raise exception 'Produto inválido, inativo ou pertencente a outra empresa.';
    end if;
  end loop;

  insert into public.erp_rfq
    (empresa_id, status, data_necessidade, prazo_resposta, condicao_pagamento, observacoes, created_by)
  values
    (v_empresa_id, 'ABERTA', p_data_necessidade, p_prazo_resposta,
     nullif(trim(coalesce(p_condicao_pagamento,'')), ''),
     nullif(trim(coalesce(p_observacoes,'')), ''), auth.uid())
  returning erp_rfq.id, erp_rfq.numero into v_rfq_id, v_numero;

  insert into public.erp_rfq_fornecedores (empresa_id, rfq_id, fornecedor_id)
  select v_empresa_id, v_rfq_id, distinct_supplier
  from (select distinct unnest(p_fornecedor_ids) as distinct_supplier) suppliers;

  for v_item in select value from jsonb_array_elements(p_itens) loop
    insert into public.erp_rfq_itens
      (empresa_id, rfq_id, produto_id, descricao, codigo, quantidade, unidade, data_necessidade, observacoes)
    values
      (v_empresa_id, v_rfq_id, (v_item->>'produto_id')::uuid,
       trim(v_item->>'descricao'), trim(v_item->>'codigo'),
       (v_item->>'quantidade')::numeric, coalesce(nullif(trim(v_item->>'unidade'),''),'UN'),
       nullif(v_item->>'data_necessidade','')::date,
       nullif(trim(coalesce(v_item->>'observacoes','')), ''));
  end loop;

  return query select v_rfq_id, v_numero;
end;
$$;

revoke all on function public.erp_compras_criar_rfq_atomica(uuid[], jsonb, date, text, text, date) from public, anon;
grant execute on function public.erp_compras_criar_rfq_atomica(uuid[], jsonb, date, text, text, date) to authenticated;

commit;
