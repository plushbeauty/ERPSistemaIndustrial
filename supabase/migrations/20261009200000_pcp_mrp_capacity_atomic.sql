begin;

create table if not exists public.pcp_programacao_capacidade (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default public.erp_current_empresa_id(),
  ordem_producao_id uuid not null references public.pcp_ordens_producao(id) on delete cascade,
  centro_trabalho text not null,
  inicio_planejado timestamptz not null,
  fim_planejado timestamptz not null,
  setup_minutos numeric(12,2) not null default 0 check (setup_minutos >= 0),
  quantidade_planejada numeric(18,6) not null check (quantidade_planejada > 0),
  prioridade integer not null default 50 check (prioridade between 1 and 100),
  status text not null default 'planejada' check (status in ('planejada','confirmada','em_execucao','concluida','cancelada')),
  observacoes text,
  criado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fim_planejado > inicio_planejado),
  unique (empresa_id, ordem_producao_id, centro_trabalho, inicio_planejado)
);

create index if not exists idx_pcp_programacao_centro_tempo
  on public.pcp_programacao_capacidade (empresa_id, centro_trabalho, inicio_planejado, fim_planejado)
  where status <> 'cancelada';

create index if not exists idx_pcp_programacao_op
  on public.pcp_programacao_capacidade (empresa_id, ordem_producao_id, status);

alter table public.pcp_programacao_capacidade enable row level security;
drop policy if exists tenant_isolation on public.pcp_programacao_capacidade;
create policy tenant_isolation on public.pcp_programacao_capacidade
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

create or replace function public.erp_pcp_validar_tenant_programacao()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.empresa_id is distinct from public.erp_current_empresa_id() then
    raise exception 'PCP_TENANT_MISMATCH';
  end if;
  if not exists (
    select 1 from public.pcp_ordens_producao op
     where op.id = new.ordem_producao_id and op.empresa_id = new.empresa_id
  ) then
    raise exception 'PCP_OP_FORA_DA_EMPRESA';
  end if;
  if new.fim_planejado <= new.inicio_planejado then
    raise exception 'PCP_INTERVALO_INVALIDO';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_pcp_validar_tenant_programacao on public.pcp_programacao_capacidade;
create trigger trg_pcp_validar_tenant_programacao
before insert or update on public.pcp_programacao_capacidade
for each row execute function public.erp_pcp_validar_tenant_programacao();

create or replace function public.erp_pcp_mrp_explodir(
  p_produto_pai_id uuid,
  p_quantidade numeric
)
returns table (
  produto_id uuid,
  codigo text,
  descricao text,
  nivel integer,
  necessidade_bruta numeric,
  saldo_disponivel numeric,
  necessidade_liquida numeric,
  perda_estimada numeric
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresa uuid := public.erp_current_empresa_id();
begin
  if v_empresa is null then raise exception 'PCP_EMPRESA_NAO_IDENTIFICADA'; end if;
  if p_quantidade is null or p_quantidade <= 0 then raise exception 'PCP_QUANTIDADE_INVALIDA'; end if;
  if not exists (
    select 1 from public.engenharia_produtos p
     where p.id = p_produto_pai_id and p.empresa_id = v_empresa and p.ativo
  ) then raise exception 'PCP_PRODUTO_FORA_DA_EMPRESA'; end if;

  return query
  with recursive explosao(componente_id, quantidade_bruta, nivel, caminho, quantidade_liquida_base) as (
    select c.componente_id,
           p_quantidade * c.quantidade_bruta,
           1,
           array[p_produto_pai_id, c.componente_id]::uuid[],
           p_quantidade * c.quantidade_liquida
      from public.engenharia_bom b
      join public.engenharia_bom_componentes c
        on c.bom_id = b.id and c.empresa_id = b.empresa_id
     where b.empresa_id = v_empresa
       and b.produto_pai_id = p_produto_pai_id
       and b.status = 'ativo'
       and b.vigente_desde <= current_date
       and (b.vigente_ate is null or b.vigente_ate >= current_date)
    union all
    select c.componente_id,
           e.quantidade_bruta * c.quantidade_bruta,
           e.nivel + 1,
           e.caminho || c.componente_id,
           e.quantidade_bruta * c.quantidade_liquida
      from explosao e
      join public.engenharia_bom b
        on b.produto_pai_id = e.componente_id
       and b.empresa_id = v_empresa
       and b.status = 'ativo'
       and b.vigente_desde <= current_date
       and (b.vigente_ate is null or b.vigente_ate >= current_date)
      join public.engenharia_bom_componentes c
        on c.bom_id = b.id and c.empresa_id = b.empresa_id
     where e.nivel < 20
       and not c.componente_id = any(e.caminho)
  ), agregada as (
    select e.componente_id,
           max(e.nivel)::integer as nivel,
           sum(e.quantidade_bruta)::numeric as bruto,
           sum(greatest(e.quantidade_bruta - e.quantidade_liquida_base, 0))::numeric as perda
      from explosao e
     group by e.componente_id
  ), saldos as (
    select s.produto_id, sum(s.quantidade)::numeric as quantidade
      from public.estoque_saldos s
     where s.empresa_id = v_empresa
     group by s.produto_id
  )
  select p.id, p.codigo, p.descricao_tecnica, a.nivel, a.bruto,
         coalesce(s.quantidade, 0),
         greatest(a.bruto - coalesce(s.quantidade, 0), 0),
         a.perda
    from agregada a
    join public.engenharia_produtos p
      on p.id = a.componente_id and p.empresa_id = v_empresa
    left join saldos s on s.produto_id = p.id
   order by a.nivel, p.codigo;
end;
$$;

commit;
