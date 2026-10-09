-- Fiscal/CO: weighted average cost with a transactional audit trail.
begin;

alter table public.erp_produtos
  add column if not exists custo_medio numeric(16,6) not null default 0;

create table if not exists public.erp_custos_historico (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  documento_tipo text not null check (documento_tipo in ('NFE_ENTRADA','RETORNO_PRODUCAO','AJUSTE_APROVADO','FECHAMENTO_OP')),
  documento_referencia text not null,
  quantidade_entrada numeric(16,4) not null check (quantidade_entrada > 0),
  custo_unitario_liquido numeric(16,6) not null check (custo_unitario_liquido >= 0),
  saldo_anterior numeric(16,4) not null check (saldo_anterior >= 0),
  custo_medio_anterior numeric(16,6) not null check (custo_medio_anterior >= 0),
  custo_medio_novo numeric(16,6) not null check (custo_medio_novo >= 0),
  valor_total_liquido numeric(18,6) not null check (valor_total_liquido >= 0),
  observacao text,
  calculado_por uuid references auth.users(id) on delete set null,
  calculado_em timestamptz not null default now(),
  unique (empresa_id, id)
);
create index if not exists idx_erp_custos_historico_produto_data
  on public.erp_custos_historico(empresa_id,produto_id,calculado_em desc);

create or replace function public.erp_fiscal_recalcular_custo_medio(
  p_produto_id uuid,
  p_quantidade_entrada numeric,
  p_custo_unitario_liquido numeric,
  p_documento_tipo text,
  p_documento_referencia text,
  p_observacao text default null
) returns public.erp_custos_historico
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_produto public.erp_produtos%rowtype;
  v_saldo numeric(16,4);
  v_custo numeric(16,6);
  v_novo numeric(16,6);
  v_result public.erp_custos_historico%rowtype;
begin
  if auth.uid() is null then raise exception 'Autenticação obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if not coalesce(public.erp_is_master(),false)
     and not coalesce(public.erp_has_permission('fiscal','criar'),false)
     and not coalesce(public.erp_has_permission('estoque','movimentar'),false) then
    raise exception 'Permissão de Fiscal/Criar ou Estoque/Movimentar necessária.';
  end if;
  if p_produto_id is null or p_quantidade_entrada is null or p_quantidade_entrada <= 0
     or p_custo_unitario_liquido is null or p_custo_unitario_liquido < 0 then
    raise exception 'Produto, quantidade positiva e custo líquido não negativo são obrigatórios.';
  end if;
  if p_documento_tipo not in ('NFE_ENTRADA','RETORNO_PRODUCAO','AJUSTE_APROVADO','FECHAMENTO_OP')
     or nullif(btrim(p_documento_referencia),'') is null then
    raise exception 'Tipo e referência do documento de origem são obrigatórios.';
  end if;

  select * into v_produto from public.erp_produtos
  where id=p_produto_id and empresa_id=v_empresa and ativo=true
  for update;
  if not found then raise exception 'Produto ativo não encontrado na empresa da sessão.'; end if;

  select coalesce(saldo_fisico,0) into v_saldo
  from public.erp_produto_estoque
  where empresa_id=v_empresa and produto_id=p_produto_id
  for update;
  if not found then v_saldo:=0; end if;
  v_custo:=coalesce(v_produto.custo_medio,0);
  v_novo:=round(((v_saldo*v_custo)+(p_quantidade_entrada*p_custo_unitario_liquido))/(v_saldo+p_quantidade_entrada),6);
  if not (v_novo >= 0 and v_novo < 'Infinity'::numeric) then raise exception 'Cálculo do custo médio resultou em valor inválido.'; end if;

  update public.erp_produtos set custo_medio=v_novo where id=p_produto_id and empresa_id=v_empresa;
  insert into public.erp_custos_historico(
    empresa_id,produto_id,documento_tipo,documento_referencia,quantidade_entrada,custo_unitario_liquido,
    saldo_anterior,custo_medio_anterior,custo_medio_novo,valor_total_liquido,observacao,calculado_por
  ) values (
    v_empresa,p_produto_id,p_documento_tipo,btrim(p_documento_referencia),p_quantidade_entrada,
    p_custo_unitario_liquido,v_saldo,v_custo,v_novo,
    round(p_quantidade_entrada*p_custo_unitario_liquido,6),nullif(btrim(coalesce(p_observacao,'')),''),auth.uid()
  ) returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.erp_fiscal_recalcular_custo_medio(uuid,numeric,numeric,text,text,text) from public, anon;
grant execute on function public.erp_fiscal_recalcular_custo_medio(uuid,numeric,numeric,text,text,text) to authenticated;

alter table public.erp_custos_historico enable row level security;
alter table public.erp_custos_historico force row level security;
drop policy if exists erp_custos_historico_tenant_select on public.erp_custos_historico;
create policy erp_custos_historico_tenant_select on public.erp_custos_historico
 for select to authenticated using (empresa_id=public.erp_current_empresa_id() or coalesce(public.erp_is_master(),false));
drop policy if exists erp_custos_historico_tenant_insert on public.erp_custos_historico;
create policy erp_custos_historico_tenant_insert on public.erp_custos_historico
 for insert to authenticated with check ((empresa_id=public.erp_current_empresa_id() or coalesce(public.erp_is_master(),false))
 and (coalesce(public.erp_is_master(),false) or coalesce(public.erp_has_permission('fiscal','criar'),false) or coalesce(public.erp_has_permission('estoque','movimentar'),false)));
revoke all on public.erp_custos_historico from anon;
grant select, insert on public.erp_custos_historico to authenticated;

commit;
