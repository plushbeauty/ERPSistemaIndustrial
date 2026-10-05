begin;

drop policy if exists erp_estoque_separacoes_select on public.erp_estoque_separacoes;
drop policy if exists erp_estoque_separacoes_insert on public.erp_estoque_separacoes;
drop policy if exists erp_estoque_separacoes_update on public.erp_estoque_separacoes;
drop policy if exists erp_estoque_separacoes_delete on public.erp_estoque_separacoes;
drop policy if exists erp_rastreabilidade_cartoes_select on public.erp_rastreabilidade_cartoes;
drop policy if exists erp_rastreabilidade_cartoes_insert on public.erp_rastreabilidade_cartoes;
drop policy if exists erp_rastreabilidade_cartoes_update on public.erp_rastreabilidade_cartoes;
drop policy if exists erp_rastreabilidade_cartoes_delete on public.erp_rastreabilidade_cartoes;
drop policy if exists erp_estoque_separacoes_rbac_select on public.erp_estoque_separacoes;
drop policy if exists erp_rastreabilidade_cartoes_rbac_select on public.erp_rastreabilidade_cartoes;

alter table public.erp_estoque_separacoes enable row level security;
alter table public.erp_rastreabilidade_cartoes enable row level security;

revoke insert, update, delete on public.erp_estoque_separacoes from authenticated;
revoke insert, update, delete on public.erp_rastreabilidade_cartoes from authenticated;
grant select on public.erp_estoque_separacoes to authenticated;
grant select on public.erp_rastreabilidade_cartoes to authenticated;

create index if not exists idx_erp_estoque_separacoes_empresa_data
  on public.erp_estoque_separacoes (empresa_id, created_at desc, id desc);

create policy erp_estoque_separacoes_rbac_select
  on public.erp_estoque_separacoes
  for select to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('estoque', 'ver'))
  );

create policy erp_rastreabilidade_cartoes_rbac_select
  on public.erp_rastreabilidade_cartoes
  for select to authenticated
  using (
    empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('estoque', 'ver'))
  );

create or replace function public.erp_estoque_separar_material(
  p_ordem_id uuid,
  p_produto_id uuid,
  p_lote_id uuid,
  p_quantidade numeric
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_id uuid := gen_random_uuid();
  v_code text;
  v_op text;
  v_final_product_id uuid;
  v_final_product_code text;
  v_final_product_name text;
  v_material_code text;
  v_material_name text;
  v_unit text;
  v_lot_code text;
  v_supplier_lot text;
  v_created_at timestamptz := now();
begin
  if auth.uid() is null or v_empresa is null then
    raise exception 'Sessão ou empresa não identificada.' using errcode = '42501';
  end if;
  if not (public.erp_is_master() or public.erp_has_permission('estoque', 'movimentar')) then
    raise exception 'Usuário sem permissão para registrar separações de estoque.' using errcode = '42501';
  end if;
  if p_ordem_id is null or p_produto_id is null
    or p_quantidade is null or p_quantidade <= 0
    or p_quantidade::text in ('NaN', 'Infinity', '-Infinity') then
    raise exception 'Informe OP, material e quantidade positiva válida.';
  end if;

  select coalesce(to_jsonb(o)->>'numero_op', to_jsonb(o)->>'numero', o.id::text),
         o.produto_id
    into v_op, v_final_product_id
    from public.erp_ordens_producao o
   where o.id = p_ordem_id
     and o.empresa_id = v_empresa
   for key share;
  if not found then
    raise exception 'Ordem de produção não encontrada nesta empresa.';
  end if;

  select p.codigo, p.nome
    into v_final_product_code, v_final_product_name
    from public.erp_produtos p
   where p.id = v_final_product_id
     and p.empresa_id = v_empresa;
  if not found then
    raise exception 'Produto final da OP não está cadastrado nesta empresa.';
  end if;

  select p.codigo, p.nome, p.unidade_medida
    into v_material_code, v_material_name, v_unit
    from public.erp_produtos p
   where p.id = p_produto_id
     and p.empresa_id = v_empresa
     and p.ativo = true
   for key share;
  if not found then
    raise exception 'Material ativo não encontrado nesta empresa.';
  end if;

  if p_lote_id is not null then
    select l.lote_interno, l.lote_fornecedor
      into v_lot_code, v_supplier_lot
      from public.erp_estoque_lotes l
     where l.id = p_lote_id
       and l.empresa_id = v_empresa
       and l.produto_id = p_produto_id
     for key share;
    if not found then
      raise exception 'Lote não encontrado para o material selecionado nesta empresa.';
    end if;
  end if;

  v_code := 'SEP-' || upper(replace(v_id::text, '-', ''));

  insert into public.erp_estoque_separacoes (
    id, empresa_id, ordem_producao_id, produto_id, lote_id,
    quantidade, status, codigo_barras, created_at
  ) values (
    v_id, v_empresa, p_ordem_id, p_produto_id, p_lote_id,
    p_quantidade, 'SEPARADO', v_code, v_created_at
  );

  insert into public.erp_rastreabilidade_cartoes (
    empresa_id, separacao_id, codigo, created_at
  ) values (
    v_empresa, v_id, v_code, v_created_at
  );

  return jsonb_build_object(
    'id', v_id,
    'op', v_op,
    'final_product', coalesce(v_final_product_code, ''),
    'final_product_name', coalesce(v_final_product_name, ''),
    'material', coalesce(v_material_code, ''),
    'material_name', coalesce(v_material_name, ''),
    'lot', coalesce(v_lot_code, ''),
    'supplier_lot', coalesce(v_supplier_lot, ''),
    'quantity', p_quantidade,
    'unit', coalesce(v_unit, ''),
    'code', v_code,
    'created_at', v_created_at
  );
end;
$$;

revoke all on function public.erp_estoque_separar_material(uuid, uuid, uuid, numeric) from public, anon;
grant execute on function public.erp_estoque_separar_material(uuid, uuid, uuid, numeric) to authenticated;

commit;
