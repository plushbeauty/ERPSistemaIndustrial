-- Estruturas mínimas de auditoria SGQ e separação, e saldo físico de lotes aguardando inspeção.
begin;
create table if not exists public.erp_sgq_auditoria(
 id bigint generated always as identity primary key,
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 entidade text not null,
 entidade_id uuid not null,
 operacao text not null check(operacao in ('INSERT','UPDATE','DELETE')),
 ator_id uuid references public.erp_usuarios(id) on delete restrict,
 ocorrido_em timestamptz not null default now(),
 antes jsonb,
 depois jsonb
);
alter table public.erp_sgq_auditoria enable row level security;
drop policy if exists erp_sgq_auditoria_select_tenant on public.erp_sgq_auditoria;
create policy erp_sgq_auditoria_select_tenant on public.erp_sgq_auditoria
 for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select on public.erp_sgq_auditoria to authenticated;
revoke insert,update,delete on public.erp_sgq_auditoria from public,anon,authenticated;

create table if not exists public.erp_estoque_separacoes(
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 ordem_producao_id uuid not null references public.erp_ordens_producao(id),
 produto_id uuid not null references public.erp_produtos(id),
 lote_id uuid references public.erp_estoque_lotes(id),
 quantidade numeric(14,3) not null default 0,
 status text not null default 'PENDENTE',
 codigo_barras text,
 created_at timestamptz not null default now()
);
create table if not exists public.erp_rastreabilidade_cartoes(
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 separacao_id uuid not null references public.erp_estoque_separacoes(id) on delete cascade,
 codigo text not null,
 impresso_em timestamptz,
 created_at timestamptz not null default now(),
 unique(empresa_id,codigo)
);
alter table public.erp_estoque_separacoes enable row level security;
alter table public.erp_rastreabilidade_cartoes enable row level security;
drop policy if exists erp_estoque_separacoes_select_tenant on public.erp_estoque_separacoes;
drop policy if exists erp_estoque_separacoes_insert_tenant on public.erp_estoque_separacoes;
drop policy if exists erp_rastreabilidade_cartoes_select_tenant on public.erp_rastreabilidade_cartoes;
drop policy if exists erp_rastreabilidade_cartoes_insert_tenant on public.erp_rastreabilidade_cartoes;
create policy erp_estoque_separacoes_select_tenant on public.erp_estoque_separacoes for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_estoque_separacoes_insert_tenant on public.erp_estoque_separacoes for insert to authenticated with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_rastreabilidade_cartoes_select_tenant on public.erp_rastreabilidade_cartoes for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy erp_rastreabilidade_cartoes_insert_tenant on public.erp_rastreabilidade_cartoes for insert to authenticated with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select,insert on public.erp_estoque_separacoes to authenticated;
grant select,insert on public.erp_rastreabilidade_cartoes to authenticated;

create or replace function public.erp_lote_producao_disponibilidade_fisica()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin
 if new.origem_lote='PRODUCAO' and upper(coalesce(new.status_inspecao,''))='AGUARDANDO' then
  new.quantidade_disponivel:=coalesce(new.quantidade_recebida,0);
 end if;
 return new;
end;
$$;
drop trigger if exists trg_erp_lote_producao_disponibilidade_fisica on public.erp_estoque_lotes;
create trigger trg_erp_lote_producao_disponibilidade_fisica
before insert or update of quantidade_recebida,status_inspecao on public.erp_estoque_lotes
for each row execute function public.erp_lote_producao_disponibilidade_fisica();
commit;