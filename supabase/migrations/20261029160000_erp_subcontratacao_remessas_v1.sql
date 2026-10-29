-- Subcontratação industrial: remessas, lotes e retornos com isolamento por empresa.
-- Usa as tabelas reais do SYSNQRA: erp_ordens_producao, erp_fornecedores,
-- erp_produtos e erp_estoque_lotes_rastreabilidade.

create table if not exists public.erp_subcontratacao_ordens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  codigo_remessa varchar(50) not null,
  producao_ordem_id uuid not null references public.erp_ordens_producao(id) on delete restrict,
  fornecedor_id uuid not null references public.erp_fornecedores(id) on delete restrict,
  data_emissao timestamptz not null default now(),
  status text not null default 'PENDENTE'
    check (status in ('PENDENTE', 'ENVIADO', 'RETORNADO', 'CANCELADO')),
  created_at timestamptz not null default now(),
  unique (empresa_id, codigo_remessa)
);

create table if not exists public.erp_subcontratacao_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  subcontratacao_id uuid not null references public.erp_subcontratacao_ordens(id) on delete cascade,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  lote_id uuid not null references public.erp_estoque_lotes_rastreabilidade(id) on delete restrict,
  quantidade_enviada numeric(12,4) not null check (quantidade_enviada > 0),
  quantidade_retornada numeric(12,4) not null default 0 check (
    quantidade_retornada >= 0 and quantidade_retornada <= quantidade_enviada
  ),
  created_at timestamptz not null default now()
);

create index if not exists idx_erp_subcontratacao_ordens_empresa_data
  on public.erp_subcontratacao_ordens (empresa_id, data_emissao desc);
create index if not exists idx_erp_subcontratacao_ordens_op
  on public.erp_subcontratacao_ordens (producao_ordem_id);
create index if not exists idx_erp_subcontratacao_itens_empresa_ordem
  on public.erp_subcontratacao_itens (empresa_id, subcontratacao_id);
create index if not exists idx_erp_subcontratacao_itens_lote
  on public.erp_subcontratacao_itens (lote_id);

alter table public.erp_subcontratacao_ordens enable row level security;
alter table public.erp_subcontratacao_itens enable row level security;

drop policy if exists erp_subcontratacao_ordens_tenant on public.erp_subcontratacao_ordens;
create policy erp_subcontratacao_ordens_tenant
  on public.erp_subcontratacao_ordens for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master());

drop policy if exists erp_subcontratacao_itens_tenant on public.erp_subcontratacao_itens;
create policy erp_subcontratacao_itens_tenant
  on public.erp_subcontratacao_itens for all to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master())
  with check (
    (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master())
    and exists (
      select 1 from public.erp_subcontratacao_ordens o
      where o.id = erp_subcontratacao_itens.subcontratacao_id
        and o.empresa_id = erp_subcontratacao_itens.empresa_id
    )
  );

grant select, insert, update, delete on public.erp_subcontratacao_ordens to authenticated;
grant select, insert, update, delete on public.erp_subcontratacao_itens to authenticated;

comment on table public.erp_subcontratacao_ordens is 'Remessas de material para processos industriais terceirizados, isoladas por empresa.';
comment on table public.erp_subcontratacao_itens is 'Itens e lotes enviados/retornados em cada remessa de subcontratação.';
