begin;
create unique index if not exists erp_ordens_producao_empresa_id_id_uq
  on public.erp_ordens_producao (empresa_id, id);

create table if not exists public.erp_acabamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  ordem_producao_id uuid not null,
  posto_trabalho text not null,
  quantidade_recebida numeric not null check (quantidade_recebida > 0),
  quantidade_acabada numeric not null check (quantidade_acabada >= 0),
  quantidade_refugo numeric not null default 0 check (quantidade_refugo >= 0),
  status text not null default 'EM_PROCESSO'
    check (status in ('EM_PROCESSO','CONCLUIDO','CANCELADO')),
  created_by uuid null references public.erp_usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint erp_acabamentos_empresa_op_fk
    foreign key (empresa_id, ordem_producao_id)
    references public.erp_ordens_producao (empresa_id, id) on delete restrict,
  constraint erp_acabamentos_quantidades_ck
    check (quantidade_acabada + quantidade_refugo <= quantidade_recebida)
);

create index if not exists erp_acabamentos_empresa_created_idx
  on public.erp_acabamentos (empresa_id, created_at desc);
create index if not exists erp_acabamentos_empresa_op_idx
  on public.erp_acabamentos (empresa_id, ordem_producao_id, created_at desc);

alter table public.erp_acabamentos enable row level security;
revoke all on public.erp_acabamentos from public, anon;
grant select, insert, update, delete on public.erp_acabamentos to authenticated;
drop policy if exists erp_acabamentos_tenant on public.erp_acabamentos;
create policy erp_acabamentos_tenant on public.erp_acabamentos
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());
notify pgrst, 'reload schema';
commit;