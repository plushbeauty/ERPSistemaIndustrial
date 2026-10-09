-- Harden tenant ownership and manufacturing semantics for the existing PCP BOM tables.
-- Additive migration: preserves current rows and existing RPC signature.
alter table public.erp_pcp_roteiro_operacoes
  add column if not exists setup_min numeric(12,3) not null default 0,
  add column if not exists tempo_peca_min numeric(12,6) not null default 0;

create or replace function public.erp_pcp_bom_adicionar(
  p_produto_pai_id uuid,
  p_produto_id uuid,
  p_sku_insumo text,
  p_qtd numeric,
  p_unidade text,
  p_custo_unitario numeric
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  e uuid;
  v uuid;
  v_sku text;
begin
  e := public.erp_current_empresa_id();
  if e is null then
    raise exception 'Empresa da sessão não identificada.';
  end if;
  if p_produto_pai_id is null or p_produto_id is null then
    raise exception 'Produto pai e componente são obrigatórios.';
  end if;
  if p_produto_pai_id = p_produto_id then
    raise exception 'Um produto não pode ser componente direto de si mesmo.';
  end if;
  if p_qtd is null or p_qtd <= 0 then
    raise exception 'A quantidade do componente deve ser maior que zero.';
  end if;
  if p_custo_unitario is null or p_custo_unitario < 0 then
    raise exception 'O custo unitário não pode ser negativo.';
  end if;
  if nullif(btrim(p_unidade), '') is null then
    raise exception 'A unidade do componente é obrigatória.';
  end if;

  if not exists (
    select 1 from public.erp_produtos
    where id = p_produto_pai_id and empresa_id = e and ativo = true
  ) then
    raise exception 'Produto pai não encontrado ou inativo na empresa atual.';
  end if;

  select codigo into v_sku
  from public.erp_produtos
  where id = p_produto_id and empresa_id = e and ativo = true;

  if v_sku is null then
    raise exception 'Componente não encontrado ou inativo na empresa atual.';
  end if;

  -- Prevent multi-level BOM cycles (parent -> component -> ... -> parent).
  if exists (
    with recursive descendants(id) as (
      select p_produto_id
      union
      select b.produto_id
      from public.erp_pcp_bom_itens b
      join descendants d on b.produto_pai_id = d.id
      where b.empresa_id = e
    )
    select 1 from descendants where id = p_produto_pai_id
  ) then
    raise exception 'Estrutura BOM recusada: criaria um ciclo entre produtos.';
  end if;

  insert into public.erp_pcp_bom_itens(
    empresa_id, produto_pai_id, produto_id, sku_insumo, qtd, unidade, custo_unitario
  ) values (
    e, p_produto_pai_id, p_produto_id, v_sku, p_qtd, upper(btrim(p_unidade)), p_custo_unitario
  ) returning id into v;

  return v;
end;
$$;

revoke all on function public.erp_pcp_bom_adicionar(uuid,uuid,text,numeric,text,numeric) from public, anon;
grant execute on function public.erp_pcp_bom_adicionar(uuid,uuid,text,numeric,text,numeric) to authenticated;

comment on column public.erp_pcp_roteiro_operacoes.setup_min is 'Tempo de preparação/setup por operação, em minutos.';
comment on column public.erp_pcp_roteiro_operacoes.tempo_peca_min is 'Tempo padrão por peça para a operação, em minutos.';
