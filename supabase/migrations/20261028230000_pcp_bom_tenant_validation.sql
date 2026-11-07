-- SYSNQRA ERP INDUSTRIAL
-- Corrige a validação de tenant na RPC de componentes BOM.
-- Não cria tabelas paralelas; a empresa vem da sessão autenticada.
begin;

create or replace function public.erp_pcp_bom_adicionar(
  p_produto_pai_id uuid,
  p_produto_id uuid,
  p_sku_insumo text,
  p_qtd numeric,
  p_unidade text,
  p_custo_unitario numeric
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_sku text;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sessão autenticada obrigatória.';
  end if;

  if v_empresa is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;

  if p_produto_pai_id is null or p_produto_id is null then
    raise exception 'Produto pai e componente são obrigatórios.';
  end if;

  if p_produto_pai_id = p_produto_id then
    raise exception 'O produto não pode ser componente de si mesmo.';
  end if;

  if p_qtd is null or p_qtd <= 0 then
    raise exception 'A quantidade do componente deve ser maior que zero.';
  end if;

  if p_custo_unitario is null or p_custo_unitario < 0 then
    raise exception 'O custo unitário não pode ser negativo.';
  end if;

  if nullif(btrim(p_unidade), '') is null then
    raise exception 'A unidade de medida é obrigatória.';
  end if;

  if not exists (
    select 1
      from public.erp_produtos p
     where p.id = p_produto_pai_id
       and p.empresa_id = v_empresa
       and coalesce(p.ativo, true) = true
  ) then
    raise exception 'Produto pai não encontrado na empresa autenticada.';
  end if;

  select p.codigo
    into v_sku
    from public.erp_produtos p
   where p.id = p_produto_id
     and p.empresa_id = v_empresa
     and coalesce(p.ativo, true) = true;

  if not found then
    raise exception 'Componente não encontrado na empresa autenticada.';
  end if;

  if nullif(btrim(p_sku_insumo), '') is not null
     and btrim(p_sku_insumo) <> v_sku then
    raise exception 'O código do componente não corresponde ao cadastro.';
  end if;

  insert into public.erp_pcp_bom_itens (
    empresa_id,
    produto_pai_id,
    produto_id,
    sku_insumo,
    qtd,
    unidade,
    custo_unitario
  ) values (
    v_empresa,
    p_produto_pai_id,
    p_produto_id,
    v_sku,
    p_qtd,
    upper(btrim(p_unidade)),
    p_custo_unitario
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.erp_pcp_bom_adicionar(uuid, uuid, text, numeric, text, numeric) from public, anon;
grant execute on function public.erp_pcp_bom_adicionar(uuid, uuid, text, numeric, text, numeric) to authenticated;

notify pgrst, 'reload schema';
commit;
