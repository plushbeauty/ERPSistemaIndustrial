begin;
create table if not exists public.erp_financeiro_apuracao_custos (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 competencia text not null check (competencia ~ '^\\d{4}-\\d{2}$'),
 data_apuracao timestamptz not null default now(),
 produto_id uuid references public.erp_produtos(id) on delete restrict,
 codigo_produto text not null, descricao_produto text not null,
 op_id uuid references public.erp_ordens_producao(id) on delete set null,
 op_numero text, quantidade_produzida numeric(18,6) not null check(quantidade_produzida>=0),
 custo_padrao_total numeric(18,6) not null, custo_real_total numeric(18,6) not null,
 custo_padrao_unitario numeric(18,6) not null, custo_real_unitario numeric(18,6) not null,
 mp_padrao numeric(18,6) not null default 0, mp_real numeric(18,6) not null default 0,
 mod_padrao numeric(18,6) not null default 0, mod_real numeric(18,6) not null default 0,
 ggf_padrao numeric(18,6) not null default 0, ggf_real numeric(18,6) not null default 0,
 causa_mp text,causa_mod text,causa_ggf text,origem text not null default 'APURACAO_PRODUCAO',
 criado_por uuid references auth.users(id),created_at timestamptz not null default now(),
 constraint erp_fin_apuracao_valores_nao_negativos check(custo_padrao_total>=0 and custo_real_total>=0 and custo_padrao_unitario>=0 and custo_real_unitario>=0)
);
create index if not exists ix_erp_fin_apuracao_empresa_competencia on public.erp_financeiro_apuracao_custos(empresa_id,competencia,data_apuracao desc);
create index if not exists ix_erp_fin_apuracao_produto on public.erp_financeiro_apuracao_custos(empresa_id,produto_id);
create index if not exists ix_erp_fin_apuracao_op on public.erp_financeiro_apuracao_custos(empresa_id,op_numero);
alter table public.erp_financeiro_apuracao_custos enable row level security;
drop policy if exists erp_financeiro_apuracao_custos_tenant on public.erp_financeiro_apuracao_custos;
create policy erp_financeiro_apuracao_custos_tenant on public.erp_financeiro_apuracao_custos for select to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
grant select on public.erp_financeiro_apuracao_custos to authenticated;
commit;
