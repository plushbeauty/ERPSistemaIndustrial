begin;

-- Never trust product identity fields submitted by the browser. Resolve code,
-- description and default unit from the active product in the current tenant.
create or replace function public.erp_compras_criar_rfq_atomica(
  p_fornecedor_ids uuid[],
  p_itens jsonb,
  p_prazo_resposta date default null,
  p_condicao_pagamento text default null,
  p_observacoes text default null,
  p_data_necessidade date default null
)
returns table (id uuid, numero bigint)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_usuario_id uuid;
  v_rfq_id uuid;
  v_numero bigint;
  v_fornecedor_count integer;
  v_item_count integer;
  v_produto_count integer;
begin
  if auth.uid() is null or v_empresa_id is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.' using errcode = '42501';
  end if;

  if not public.erp_has_permission('compras', 'ver')
    or not public.erp_has_permission('compras', 'criar') then
    raise exception 'Sem permissão para consultar e criar cotações de compras.' using errcode = '42501';
  end if;

  if p_fornecedor_ids is null or cardinality(p_fornecedor_ids) = 0
    or cardinality(p_fornecedor_ids) > 500
    or cardinality(p_fornecedor_ids) <> (
      select count(distinct x.fornecedor_id)::integer
      from unnest(p_fornecedor_ids) as x(fornecedor_id)
    ) then
    raise exception 'Selecione entre 1 e 500 fornecedores sem duplicidade.' using errcode = '22023';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'Os itens da cotação devem ser enviados como uma lista.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 1000 then
    raise exception 'Informe entre 1 e 1000 itens para a cotação.' using errcode = '22023';
  end if;

  select u.id into v_usuario_id
  from public.erp_usuarios u
  where u.auth_user_id = auth.uid()
    and u.empresa_id = v_empresa_id
    and u.ativo = true
    and u.deleted_at is null
  limit 1;

  if v_usuario_id is null then
    raise exception 'Perfil ERP ativo não localizado na empresa atual.' using errcode = '42501';
  end if;

  select count(*)::integer into v_fornecedor_count
  from public.erp_fornecedores f
  where f.id = any(p_fornecedor_ids)
    and f.empresa_id = v_empresa_id
    and f.ativo = true;

  if v_fornecedor_count <> cardinality(p_fornecedor_ids) then
    raise exception 'Um ou mais fornecedores não estão ativos na empresa atual.' using errcode = '23503';
  end if;

  select count(*)::integer into v_item_count
  from jsonb_to_recordset(p_itens) as i(
    produto_id uuid,
    quantidade numeric,
    data_necessidade date,
    observacoes text
  )
  where i.produto_id is not null
    and i.quantidade > 0
    and i.quantidade::text not in ('NaN', 'Infinity', '-Infinity');

  if v_item_count <> jsonb_array_length(p_itens) then
    raise exception 'Há item com produto ou quantidade inválidos.' using errcode = '22023';
  end if;

  select count(*)::integer into v_produto_count
  from public.erp_produtos p
  where p.id in (
    select i.produto_id
    from jsonb_to_recordset(p_itens) as i(
      produto_id uuid,
      quantidade numeric,
      data_necessidade date,
      observacoes text
    )
  )
    and p.empresa_id = v_empresa_id
    and p.ativo = true;

  if v_produto_count <> (
    select count(distinct i.produto_id)::integer
    from jsonb_to_recordset(p_itens) as i(
      produto_id uuid,
      quantidade numeric,
      data_necessidade date,
      observacoes text
    )
  ) then
    raise exception 'Um ou mais produtos não estão ativos na empresa atual.' using errcode = '23503';
  end if;

  insert into public.erp_rfq (
    empresa_id, status, data_necessidade, prazo_resposta,
    condicao_pagamento, observacoes, created_by
  ) values (
    v_empresa_id, 'ABERTA', p_data_necessidade, p_prazo_resposta,
    nullif(btrim(p_condicao_pagamento), ''), nullif(btrim(p_observacoes), ''), v_usuario_id
  )
  returning erp_rfq.id, erp_rfq.numero into v_rfq_id, v_numero;

  insert into public.erp_rfq_fornecedores (empresa_id, rfq_id, fornecedor_id)
  select v_empresa_id, v_rfq_id, requested.fornecedor_id
  from unnest(p_fornecedor_ids) as requested(fornecedor_id);

  insert into public.erp_rfq_itens (
    empresa_id, rfq_id, produto_id, descricao, codigo,
    quantidade, unidade, data_necessidade, observacoes
  )
  select
    v_empresa_id,
    v_rfq_id,
    p.id,
    coalesce(nullif(btrim(p.nome), ''), nullif(btrim(p.descricao), ''), p.codigo),
    p.codigo,
    i.quantidade,
    coalesce(nullif(btrim(p.unidade_compra), ''), nullif(btrim(p.unidade), ''), 'UN'),
    i.data_necessidade,
    nullif(btrim(i.observacoes), '')
  from jsonb_to_recordset(p_itens) as i(
    produto_id uuid,
    quantidade numeric,
    data_necessidade date,
    observacoes text
  )
  join public.erp_produtos p
    on p.id = i.produto_id
   and p.empresa_id = v_empresa_id
   and p.ativo = true;

  return query select v_rfq_id, v_numero;
end;
$function$;

revoke all on function public.erp_compras_criar_rfq_atomica(uuid[], jsonb, date, text, text, date) from public, anon;
grant execute on function public.erp_compras_criar_rfq_atomica(uuid[], jsonb, date, text, text, date) to authenticated;

commit;
