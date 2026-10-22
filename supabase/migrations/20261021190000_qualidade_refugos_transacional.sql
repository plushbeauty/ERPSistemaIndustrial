/*
 * SYSNQRA — Refugos e não conformidades
 * Revisão QAL-REFUGO-001 | 2026-10-21
 * Registros vinculados à OP e à empresa derivada da sessão autenticada.
 */
create table if not exists public.erp_qualidade_defeitos_motivos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo_defeito text not null,
  descricao text not null,
  classificacao text not null check (classificacao in ('CRÍTICO','MAIOR','MENOR')),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo_defeito)
);

create table if not exists public.erp_qualidade_refugos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  ordem_producao_id uuid not null references public.erp_ordens_producao(id),
  defeito_id uuid not null references public.erp_qualidade_defeitos_motivos(id),
  quantidade_refugada integer not null check (quantidade_refugada > 0),
  peso_refugo_kg numeric(18,4) check (peso_refugo_kg is null or peso_refugo_kg >= 0),
  turno text not null default '1',
  operador text not null,
  disposicao_material text not null check (disposicao_material in ('RETRABALHO','SUCATAMENTO','SEGREGADO')),
  observacoes text,
  criado_por uuid,
  created_at timestamptz not null default now()
);

create index if not exists erp_qualidade_refugos_empresa_data_idx
  on public.erp_qualidade_refugos (empresa_id, created_at desc);
create index if not exists erp_qualidade_refugos_empresa_op_idx
  on public.erp_qualidade_refugos (empresa_id, ordem_producao_id);

alter table public.erp_qualidade_defeitos_motivos enable row level security;
alter table public.erp_qualidade_refugos enable row level security;

drop policy if exists erp_qualidade_defeitos_select_tenant on public.erp_qualidade_defeitos_motivos;
create policy erp_qualidade_defeitos_select_tenant on public.erp_qualidade_defeitos_motivos
  for select to authenticated using (empresa_id = (select public.erp_current_empresa_id()));
drop policy if exists erp_qualidade_refugos_select_tenant on public.erp_qualidade_refugos;
create policy erp_qualidade_refugos_select_tenant on public.erp_qualidade_refugos
  for select to authenticated using (empresa_id = (select public.erp_current_empresa_id()));

revoke all on public.erp_qualidade_defeitos_motivos from anon, authenticated;
revoke all on public.erp_qualidade_refugos from anon, authenticated;
grant select on public.erp_qualidade_defeitos_motivos to authenticated;
grant select on public.erp_qualidade_refugos to authenticated;

create or replace function public.erp_registrar_refugo(
  p_ordem_producao_id uuid,
  p_defeito_id uuid,
  p_quantidade_refugada integer,
  p_peso_refugo_kg numeric,
  p_turno text,
  p_operador text,
  p_disposicao_material text,
  p_observacoes text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
  v_id uuid;
  v_planejada numeric;
  v_produzida numeric;
  v_refugada numeric;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada obrigatória.'; end if;
  if v_empresa is null then raise exception 'Empresa da sessão não identificada.'; end if;
  if p_quantidade_refugada is null or p_quantidade_refugada <= 0 then raise exception 'Quantidade refug ada deve ser positiva.'; end if;
  if nullif(trim(p_operador),'') is null then raise exception 'Operador é obrigatório.'; end if;
  if p_disposicao_material not in ('RETRABALHO','SUCATAMENTO','SEGREGADO') then raise exception 'Disposição inválida.'; end if;
  if p_peso_refugo_kg is not null and p_peso_refugo_kg < 0 then raise exception 'Peso não pode ser negativo.'; end if;

  select coalesce(quantidade_planejada, quantidade, 0), coalesce(quantidade_produzida,0)
    into v_planejada, v_produzida
    from public.erp_ordens_producao
    where id = p_ordem_producao_id and empresa_id = v_empresa
    for update;
  if not found then raise exception 'OP não encontrada na empresa autenticada.'; end if;

  perform 1 from public.erp_qualidade_defeitos_motivos
    where id = p_defeito_id and empresa_id = v_empresa and ativo = true;
  if not found then raise exception 'Motivo de defeito inativo ou fora da empresa.'; end if;

  select coalesce(sum(quantidade_refugada),0) into v_refugada
    from public.erp_qualidade_refugos
    where empresa_id = v_empresa and ordem_producao_id = p_ordem_producao_id;

  if v_refugada + p_quantidade_refugada > greatest(v_planejada, v_produzida) then
    raise exception 'Refugo acumulado excede a quantidade produzida/planejada da OP.';
  end if;

  insert into public.erp_qualidade_refugos
    (empresa_id, ordem_producao_id, defeito_id, quantidade_refugada, peso_refugo_kg,
     turno, operador, disposicao_material, observacoes, criado_por)
  values
    (v_empresa, p_ordem_producao_id, p_defeito_id, p_quantidade_refugada, p_peso_refugo_kg,
     coalesce(nullif(trim(p_turno),''),'1'), trim(p_operador), p_disposicao_material,
     nullif(trim(p_observacoes),''), auth.uid())
  returning id into v_id;

  return jsonb_build_object('id',v_id,'ordem_producao_id',p_ordem_producao_id,
    'quantidade_refugada',p_quantidade_refugada,'total_refugado_op',v_refugada+p_quantidade_refugada,
    'quantidade_produzida',v_produzida,'quantidade_boa_estimada',greatest(v_produzida-(v_refugada+p_quantidade_refugada),0));
end;
$$;

revoke all on function public.erp_registrar_refugo(uuid,uuid,integer,numeric,text,text,text,text) from public, anon;
grant execute on function public.erp_registrar_refugo(uuid,uuid,integer,numeric,text,text,text,text) to authenticated;
