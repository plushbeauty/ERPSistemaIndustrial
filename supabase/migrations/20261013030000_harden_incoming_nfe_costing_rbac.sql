begin;

-- Harden the incoming-NF posting boundary. The helper must not be callable
-- directly by browser roles; only the checked, tenant-scoped posting RPC invokes it.
create or replace function public.erp_registrar_custo_medio_nfe(
  p_produto_id uuid,
  p_lote_id uuid,
  p_endereco_id uuid,
  p_quantidade numeric,
  p_valor_liquido_unitario numeric,
  p_documento_origem text
) returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_saldo numeric(18,6);
  v_custo numeric(18,6);
  v_novo_custo numeric(18,6);
  v_chave text;
begin
  if auth.uid() is null or v_empresa_id is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.erp_usuarios u
     where u.auth_user_id = auth.uid()
       and u.empresa_id = v_empresa_id
       and u.ativo = true
       and u.deleted_at is null
  ) then
    raise exception 'Perfil ERP ativo não localizado na empresa atual.' using errcode = '42501';
  end if;

  if not (
    public.erp_has_permission('estoque', 'criar')
    or public.erp_has_permission('fiscal', 'editar')
  ) then
    raise exception 'Sem permissão para escriturar entrada fiscal e atualizar custo de estoque.' using errcode = '42501';
  end if;

  if p_produto_id is null or p_lote_id is null or p_endereco_id is null
    or p_quantidade is null or p_valor_liquido_unitario is null
    or p_quantidade <= 0 or p_valor_liquido_unitario < 0
    or p_quantidade::text in ('NaN', 'Infinity', '-Infinity')
    or p_valor_liquido_unitario::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'QUANTIDADE_OU_CUSTO_INVALIDO' using errcode = '22023';
  end if;

  if p_documento_origem !~ '^NFE:[0-9]{44}$' then
    raise exception 'DOCUMENTO_FISCAL_DE_ORIGEM_INVALIDO' using errcode = '22023';
  end if;
  v_chave := substring(p_documento_origem from 5);

  if not exists (
    select 1
      from public.fiscal_nfe_entradas n
     where n.empresa_id = v_empresa_id
       and n.chave_acesso = v_chave
       and n.status = 'rascunho'
  ) then
    raise exception 'NFE_RASCUNHO_NAO_ENCONTRADA_NO_TENANT' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.estoque_lotes l
     where l.id = p_lote_id
       and l.produto_id = p_produto_id
       and l.empresa_id = v_empresa_id
  ) then
    raise exception 'LOTE_NAO_ENCONTRADO_NO_TENANT' using errcode = '23503';
  end if;

  if not exists (
    select 1
      from public.estoque_enderecos e
     where e.id = p_endereco_id
       and e.empresa_id = v_empresa_id
       and e.ativo = true
  ) then
    raise exception 'ENDERECO_NAO_ENCONTRADO_NO_TENANT' using errcode = '23503';
  end if;

  -- Serialize weighted-average calculations per tenant/product. Locking is
  -- deliberately separate from SUM/AVG because PostgreSQL forbids FOR UPDATE
  -- on aggregate queries.
  perform pg_advisory_xact_lock(
    hashtextextended(v_empresa_id::text || ':' || p_produto_id::text, 0)
  );

  select coalesce(sum(s.quantidade), 0),
         case
           when coalesce(sum(s.quantidade), 0) = 0 then 0
           else sum(s.quantidade * s.custo_medio) / sum(s.quantidade)
         end
    into v_saldo, v_custo
    from public.estoque_saldos s
   where s.produto_id = p_produto_id
     and s.empresa_id = v_empresa_id;

  v_novo_custo := coalesce(
    ((v_saldo * v_custo) + (p_quantidade * p_valor_liquido_unitario))
      / nullif(v_saldo + p_quantidade, 0),
    0
  );

  insert into public.estoque_saldos
    (empresa_id, produto_id, lote_id, endereco_id, quantidade, custo_medio, updated_at)
  values
    (v_empresa_id, p_produto_id, p_lote_id, p_endereco_id, p_quantidade, v_novo_custo, now())
  on conflict (empresa_id, produto_id, lote_id, endereco_id)
  do update set
    quantidade = public.estoque_saldos.quantidade + excluded.quantidade,
    custo_medio = excluded.custo_medio,
    updated_at = now();

  update public.estoque_lotes
     set custo_unitario = p_valor_liquido_unitario
   where id = p_lote_id
     and empresa_id = v_empresa_id;

  insert into public.fiscal_historico_custos
    (empresa_id, produto_id, lote_id, documento_origem, quantidade, valor_liquido_unitario,
     saldo_anterior, custo_medio_anterior, custo_medio_novo)
  values
    (v_empresa_id, p_produto_id, p_lote_id, p_documento_origem, p_quantidade,
     p_valor_liquido_unitario, v_saldo, v_custo, v_novo_custo);

  return v_novo_custo;
end;
$function$;

create or replace function public.erp_escriturar_nfe_entrada(p_nfe_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_empresa_id uuid := public.erp_current_empresa_id();
  v_nfe public.fiscal_nfe_entradas%rowtype;
  v_item jsonb;
  v_count integer := 0;
  v_cost numeric(18,6);
  v_product uuid;
  v_lot uuid;
  v_address uuid;
  v_qty numeric(18,6);
  v_unit_cost numeric(18,6);
begin
  if auth.uid() is null or v_empresa_id is null then
    raise exception 'Sessão autenticada e empresa ativa são obrigatórias.' using errcode = '42501';
  end if;

  if not exists (
    select 1
      from public.erp_usuarios u
     where u.auth_user_id = auth.uid()
       and u.empresa_id = v_empresa_id
       and u.ativo = true
       and u.deleted_at is null
  ) then
    raise exception 'Perfil ERP ativo não localizado na empresa atual.' using errcode = '42501';
  end if;

  if not (
    public.erp_has_permission('estoque', 'criar')
    or public.erp_has_permission('fiscal', 'editar')
  ) then
    raise exception 'Sem permissão para escriturar entrada fiscal.' using errcode = '42501';
  end if;

  select *
    into v_nfe
    from public.fiscal_nfe_entradas
   where id = p_nfe_id
     and empresa_id = v_empresa_id
   for update;

  if not found then
    raise exception 'NFE_ENTRADA_NAO_ENCONTRADA_NO_TENANT' using errcode = 'P0002';
  end if;
  if v_nfe.status = 'escriturada' then
    raise exception 'NFE_JA_ESCRITURADA' using errcode = '23505';
  end if;
  if v_nfe.status <> 'rascunho' then
    raise exception 'STATUS_NFE_NAO_PERMITE_ESCRITURACAO' using errcode = '22023';
  end if;
  if jsonb_typeof(v_nfe.itens) <> 'array' or jsonb_array_length(v_nfe.itens) = 0 then
    raise exception 'NFE_SEM_ITENS' using errcode = '22023';
  end if;

  for v_item in
    select value from jsonb_array_elements(v_nfe.itens)
  loop
    v_product := (v_item->>'produto_id')::uuid;
    v_lot := (v_item->>'lote_id')::uuid;
    v_address := (v_item->>'endereco_id')::uuid;
    v_qty := (v_item->>'quantidade')::numeric;
    v_unit_cost := (v_item->>'valor_liquido_unitario')::numeric;

    if v_product is null or v_lot is null or v_address is null
      or v_qty is null or v_unit_cost is null
      or v_qty <= 0 or v_unit_cost < 0
      or v_qty::text in ('NaN', 'Infinity', '-Infinity')
      or v_unit_cost::text in ('NaN', 'Infinity', '-Infinity') then
      raise exception 'ITEM_NFE_COM_QUANTIDADE_OU_CUSTO_INVALIDO' using errcode = '22023';
    end if;

    if not exists (
      select 1
        from public.estoque_enderecos e
       where e.id = v_address
         and e.empresa_id = v_empresa_id
         and e.ativo = true
    ) then
      raise exception 'ENDERECO_NAO_ENCONTRADO_NO_TENANT' using errcode = '23503';
    end if;

    v_cost := public.erp_registrar_custo_medio_nfe(
      v_product, v_lot, v_address, v_qty, v_unit_cost,
      'NFE:' || v_nfe.chave_acesso
    );
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'NFE_SEM_ITENS' using errcode = '22023';
  end if;

  update public.fiscal_nfe_entradas
     set status = 'escriturada',
         escriturada_em = now()
   where id = p_nfe_id
     and empresa_id = v_empresa_id;

  return jsonb_build_object(
    'nfe_id', p_nfe_id,
    'status', 'escriturada',
    'itens_processados', v_count,
    'ultimo_custo_medio', v_cost
  );
end;
$function$;

revoke all on function public.erp_registrar_custo_medio_nfe(uuid, uuid, uuid, numeric, numeric, text) from public, anon, authenticated;
revoke all on function public.erp_escriturar_nfe_entrada(uuid) from public, anon;
grant execute on function public.erp_escriturar_nfe_entrada(uuid) to authenticated;

commit;
