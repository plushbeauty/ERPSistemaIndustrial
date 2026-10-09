begin;

alter table public.erp_pcp_bom_itens
  add column if not exists rendimento_percentual numeric(7,4) not null default 100
    check (rendimento_percentual > 0 and rendimento_percentual <= 100),
  add column if not exists perda_galvanica_percentual numeric(7,4) not null default 0
    check (perda_galvanica_percentual >= 0 and perda_galvanica_percentual <= 100),
  add column if not exists perda_mecanica_percentual numeric(7,4) not null default 0
    check (perda_mecanica_percentual >= 0 and perda_mecanica_percentual <= 100);

create or replace function public.erp_pcp_bom_adicionar(
  p_produto_pai_id uuid,
  p_produto_id uuid,
  p_sku_insumo text,
  p_qtd numeric,
  p_unidade text,
  p_custo_unitario numeric,
  p_rendimento_percentual numeric,
  p_perda_galvanica_percentual numeric,
  p_perda_mecanica_percentual numeric
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa_id uuid;
  v_id uuid;
  v_produto_pai_valido boolean;
  v_componente_valido boolean;
begin
  v_empresa_id := public.erp_current_empresa_id();
  if v_empresa_id is null then
    if not public.erp_is_master() then
      raise exception 'Empresa não identificada para a estrutura de materiais.';
    end if;
    raise exception 'O Master deve selecionar uma empresa antes de editar a estrutura de materiais.';
  end if;

  if p_produto_pai_id is null or p_produto_id is null or p_produto_pai_id = p_produto_id then
    raise exception 'Produto pai e componente devem ser válidos e diferentes.';
  end if;
  if p_qtd is null or p_qtd <= 0 then
    raise exception 'A quantidade do componente deve ser maior que zero.';
  end if;
  if coalesce(btrim(p_unidade), '') = '' then
    raise exception 'A unidade do componente é obrigatória.';
  end if;
  if p_custo_unitario is null or p_custo_unitario < 0 then
    raise exception 'O custo unitário não pode ser negativo.';
  end if;
  if p_rendimento_percentual is null or p_rendimento_percentual <= 0 or p_rendimento_percentual > 100 then
    raise exception 'O rendimento deve ser maior que zero e menor ou igual a 100%.';
  end if;
  if p_perda_galvanica_percentual is null or p_perda_galvanica_percentual < 0 or p_perda_galvanica_percentual > 100
    or p_perda_mecanica_percentual is null or p_perda_mecanica_percentual < 0 or p_perda_mecanica_percentual > 100 then
    raise exception 'As perdas galvânica e mecânica devem estar entre 0% e 100%.';
  end if;

  select exists (
    select 1 from public.erp_produtos
    where id = p_produto_pai_id and empresa_id = v_empresa_id and ativo = true
  ) into v_produto_pai_valido;
  select exists (
    select 1 from public.erp_produtos
    where id = p_produto_id and empresa_id = v_empresa_id and ativo = true
  ) into v_componente_valido;

  if not v_produto_pai_valido or not v_componente_valido then
    raise exception 'Produto pai ou componente não pertence à empresa ativa.';
  end if;

  insert into public.erp_pcp_bom_itens (
    empresa_id, produto_pai_id, produto_id, sku_insumo, qtd, unidade, custo_unitario,
    rendimento_percentual, perda_galvanica_percentual, perda_mecanica_percentual
  ) values (
    v_empresa_id, p_produto_pai_id, p_produto_id, btrim(p_sku_insumo), p_qtd, btrim(p_unidade), p_custo_unitario,
    p_rendimento_percentual, p_perda_galvanica_percentual, p_perda_mecanica_percentual
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.erp_pcp_bom_adicionar(
  p_produto_pai_id uuid,
  p_produto_id uuid,
  p_sku_insumo text,
  p_qtd numeric,
  p_unidade text,
  p_custo_unitario numeric
) returns uuid
language sql
security invoker
set search_path = public
as $
  select public.erp_pcp_bom_adicionar(
    p_produto_pai_id, p_produto_id, p_sku_insumo, p_qtd, p_unidade, p_custo_unitario, 100, 0, 0
  );
$;

revoke all on function public.erp_pcp_bom_adicionar(uuid,uuid,text,numeric,text,numeric,numeric,numeric,numeric) from public, anon;
grant execute on function public.erp_pcp_bom_adicionar(uuid,uuid,text,numeric,text,numeric,numeric,numeric,numeric) to authenticated;
revoke all on function public.erp_pcp_bom_adicionar(uuid,uuid,text,numeric,text,numeric) from public, anon;
grant execute on function public.erp_pcp_bom_adicionar(uuid,uuid,text,numeric,text,numeric) to authenticated;

commit;
