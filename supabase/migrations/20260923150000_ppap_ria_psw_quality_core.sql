-- PPAP / RIA / PSW core: inspection plan, sampled measurements and PSW readiness.
create table if not exists public.erp_ppap_ria (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo text not null,
  produto_id uuid references public.erp_produtos(id),
  revisao text,
  cliente_nome text,
  cliente_codigo text,
  fornecedor_nome text,
  nivel_submissao text not null default '3',
  tipo_submissao text not null default 'Inicial',
  motivo_submissao text,
  lote_piloto text,
  quantidade_lote numeric(18,6) not null default 0,
  quantidade_amostra numeric(18,6) not null default 0,
  status text not null default 'RASCUNHO',
  conformidade_percentual numeric(9,4) not null default 0,
  psw_liberado boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empresa_id,codigo)
);

create table if not exists public.erp_ppap_ria_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  ppap_id uuid not null references public.erp_ppap_ria(id) on delete cascade,
  plano_inspecao_id uuid references public.erp_planos_inspecao(id) on delete set null,
  sequencia integer not null,
  caracteristica text not null,
  especificacao text,
  unidade text,
  nominal numeric(18,6),
  limite_inferior numeric(18,6),
  limite_superior numeric(18,6),
  metodo_inspecao text,
  frequencia text,
  amostras numeric(18,6)[] not null default '{}',
  valor_encontrado numeric(18,6),
  media numeric(18,6),
  desvio_padrao numeric(18,6),
  minimo_encontrado numeric(18,6),
  maximo_encontrado numeric(18,6),
  status text not null default 'PENDENTE',
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_ppap_psw (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  ppap_id uuid not null references public.erp_ppap_ria(id) on delete cascade,
  part_number text,
  part_name text,
  drawing_number text,
  engineering_change_level text,
  weight numeric(18,6),
  declaration_status text not null default 'PENDENTE',
  customer_approval text,
  authorized_by text,
  authorized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(ppap_id)
);

create index if not exists idx_ppap_empresa_status on public.erp_ppap_ria(empresa_id,status);
create index if not exists idx_ppap_itens_ppap on public.erp_ppap_ria_itens(ppap_id,sequencia);

alter table public.erp_ppap_ria enable row level security;
alter table public.erp_ppap_ria_itens enable row level security;
alter table public.erp_ppap_psw enable row level security;

drop policy if exists erp_ppap_ria_tenant on public.erp_ppap_ria;
create policy erp_ppap_ria_tenant on public.erp_ppap_ria for all to authenticated
using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_ppap_ria_itens_tenant on public.erp_ppap_ria_itens;
create policy erp_ppap_ria_itens_tenant on public.erp_ppap_ria_itens for all to authenticated
using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists erp_ppap_psw_tenant on public.erp_ppap_psw;
create policy erp_ppap_psw_tenant on public.erp_ppap_psw for all to authenticated
using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master())
with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

create or replace function public.erp_ppap_avaliar_item(
  p_item_id uuid,
  p_valor numeric
) returns text
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare r public.erp_ppap_ria_itens%rowtype;
begin
  select * into r from public.erp_ppap_ria_itens where id=p_item_id;
  if not found then raise exception 'Item PPAP não encontrado'; end if;
  update public.erp_ppap_ria_itens
    set valor_encontrado=p_valor,
        status=case
          when p_valor is null then 'PENDENTE'
          when (limite_inferior is not null and p_valor < limite_inferior)
            or (limite_superior is not null and p_valor > limite_superior) then 'NAO_CONFORME'
          else 'CONFORME'
        end,
        updated_at=now()
  where id=p_item_id;
  return (select status from public.erp_ppap_ria_itens where id=p_item_id);
end;
$$;

revoke all on function public.erp_ppap_avaliar_item(uuid,numeric) from public;
grant execute on function public.erp_ppap_avaliar_item(uuid,numeric) to authenticated;

create or replace function public.erp_ppap_recalcular_resumo(p_ppap_id uuid)
returns numeric
language plpgsql
security invoker
set search_path=pg_catalog,public
as $$
declare pct numeric;
begin
  select coalesce(round(100.0 * count(*) filter(where status='CONFORME') / nullif(count(*) filter(where valor_encontrado is not null),0),2),0)
    into pct
  from public.erp_ppap_ria_itens where ppap_id=p_ppap_id;
  update public.erp_ppap_ria
    set conformidade_percentual=pct,
        psw_liberado=(pct=100 and exists(select 1 from public.erp_ppap_ria_itens i where i.ppap_id=p_ppap_id and i.valor_encontrado is not null)),
        status=case when pct=100 and exists(select 1 from public.erp_ppap_ria_itens i where i.ppap_id=p_ppap_id and i.valor_encontrado is not null) then 'CONFORME' else 'EM_ANALISE' end,
        updated_at=now()
  where id=p_ppap_id;
  return pct;
end;
$$;

revoke all on function public.erp_ppap_recalcular_resumo(uuid) from public;
grant execute on function public.erp_ppap_recalcular_resumo(uuid) to authenticated;
