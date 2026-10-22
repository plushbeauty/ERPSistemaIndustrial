/*
 * SYSNQRA — Estrutura BOM transacional
 * Revisão ENG-BOM-001 | 2026-10-21
 * Empresa derivada da sessão no banco; sem aceitar empresa_id do navegador.
 */
create table if not exists public.erp_engenharia_bom (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  produto_pai_id uuid not null references public.erp_produtos(id),
  ferramenta_id uuid,
  versao integer not null check (versao > 0),
  observacoes text,
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','HOMOLOGADA','OBSOLETA')),
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_engenharia_bom_versao_uk unique (empresa_id, produto_pai_id, versao)
);

create table if not exists public.erp_engenharia_bom_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  bom_id uuid not null references public.erp_engenharia_bom(id) on delete cascade,
  componente_id uuid not null references public.erp_produtos(id),
  quantidade_gasto numeric(18,6) not null check (quantidade_gasto > 0),
  perda_pct numeric(8,4) not null default 0 check (perda_pct >= 0 and perda_pct <= 100),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  constraint erp_engenharia_bom_item_uk unique (bom_id, componente_id)
);

create index if not exists erp_engenharia_bom_empresa_produto_idx
  on public.erp_engenharia_bom (empresa_id, produto_pai_id, versao desc);
create index if not exists erp_engenharia_bom_itens_empresa_bom_idx
  on public.erp_engenharia_bom_itens (empresa_id, bom_id);

alter table public.erp_engenharia_bom enable row level security;
alter table public.erp_engenharia_bom_itens enable row level security;

drop policy if exists erp_engenharia_bom_select_tenant on public.erp_engenharia_bom;
create policy erp_engenharia_bom_select_tenant on public.erp_engenharia_bom
  for select to authenticated using (empresa_id = (select public.erp_current_empresa_id()));
drop policy if exists erp_engenharia_bom_itens_select_tenant on public.erp_engenharia_bom_itens;
create policy erp_engenharia_bom_itens_select_tenant on public.erp_engenharia_bom_itens
  for select to authenticated using (empresa_id = (select public.erp_current_empresa_id()));

revoke all on public.erp_engenharia_bom from anon, authenticated;
revoke all on public.erp_engenharia_bom_itens from anon, authenticated;
grant select on public.erp_engenharia_bom to authenticated;
grant select on public.erp_engenharia_bom_itens to authenticated;

create or replace function public.erp_salvar_bom_mestre(
  p_produto_pai_id uuid,
  p_ferramenta_id uuid,
  p_versao integer,
  p_observacoes text,
  p_componentes_json jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_bom_id uuid;
  v_count integer;
  v_item jsonb;
  v_componente uuid;
  v_qtd numeric;
  v_perda numeric;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if p_produto_pai_id is null or p_versao is null or p_versao < 1 then
    raise exception 'Produto mestre e versão positiva são obrigatórios.';
  end if;
  if jsonb_typeof(p_componentes_json) <> 'array' or jsonb_array_length(p_componentes_json) = 0 then
    raise exception 'A estrutura precisa conter ao menos um componente.';
  end if;
  if jsonb_array_length(p_componentes_json) > 500 then raise exception 'Limite de 500 componentes por ficha.'; end if;

  perform 1 from public.erp_produtos
    where id = p_produto_pai_id and empresa_id = v_empresa and ativo = true
    for share;
  if not found then raise exception 'Produto mestre inativo ou fora da empresa atual.'; end if;

  if p_ferramenta_id is not null then
    perform 1 from public.erp_ferramentas_industriais
      where id = p_ferramenta_id and empresa_id = v_empresa and ativo = true
      for share;
    if not found then raise exception 'Ferramental inativo ou fora da empresa atual.'; end if;
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_componentes_json) e
    where nullif(e->>'componente_id','') is null
       or coalesce((e->>'quantidade_gasto')::numeric,0) <= 0
       or coalesce((e->>'perda_pct')::numeric,0) < 0
       or coalesce((e->>'perda_pct')::numeric,0) > 100
  ) then raise exception 'Componente, consumo positivo e perda entre 0 e 100 são obrigatórios.'; end if;

  select count(*) into v_count from (
    select e->>'componente_id' as id
    from jsonb_array_elements(p_componentes_json) e
    group by e->>'componente_id' having count(*) > 1
  ) d;
  if v_count > 0 then raise exception 'A lista contém componentes duplicados.'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_componentes_json) e
    where (e->>'componente_id')::uuid = p_produto_pai_id
  ) then raise exception 'O produto mestre não pode ser componente direto de si mesmo.'; end if;

  if exists (
    select 1 from jsonb_array_elements(p_componentes_json) e
    left join public.erp_produtos p on p.id = (e->>'componente_id')::uuid
      and p.empresa_id = v_empresa and p.ativo = true
    where p.id is null
  ) then raise exception 'Um componente está inativo ou não pertence à empresa atual.'; end if;

  insert into public.erp_engenharia_bom
    (empresa_id, produto_pai_id, ferramenta_id, versao, observacoes, status, criado_por, updated_at)
  values
    (v_empresa, p_produto_pai_id, p_ferramenta_id, p_versao, nullif(trim(p_observacoes),''), 'RASCUNHO', auth.uid(), now())
  on conflict (empresa_id, produto_pai_id, versao) do update
    set ferramenta_id = excluded.ferramenta_id,
        observacoes = excluded.observacoes,
        status = 'RASCUNHO',
        updated_at = now()
  returning id into v_bom_id;

  delete from public.erp_engenharia_bom_itens
  where empresa_id = v_empresa and bom_id = v_bom_id;

  for v_item in select value from jsonb_array_elements(p_componentes_json)
  loop
    v_componente := (v_item->>'componente_id')::uuid;
    v_qtd := (v_item->>'quantidade_gasto')::numeric;
    v_perda := coalesce((v_item->>'perda_pct')::numeric,0);
    insert into public.erp_engenharia_bom_itens
      (empresa_id, bom_id, componente_id, quantidade_gasto, perda_pct, ordem)
    values (v_empresa, v_bom_id, v_componente, v_qtd, v_perda, 0);
  end loop;

  return jsonb_build_object('id',v_bom_id,'produto_pai_id',p_produto_pai_id,'versao',p_versao,'status','RASCUNHO','componentes',jsonb_array_length(p_componentes_json));
end;
$$;

revoke all on function public.erp_salvar_bom_mestre(uuid,uuid,integer,text,jsonb) from public, anon;
grant execute on function public.erp_salvar_bom_mestre(uuid,uuid,integer,text,jsonb) to authenticated;
