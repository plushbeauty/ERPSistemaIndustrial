-- MOLDPLAS ERP Industrial
-- SGQ: genealogia de lotes / rastreabilidade reversa
-- Revisao: 2026-10-19
-- A tabela registra relacoes explicitas de lote origem -> lote derivado.
-- RLS valida empresa e compatibilidade dos produtos com a empresa do registro.

create table if not exists public.erp_qualidade_genealogia_lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  codigo_lote_pai varchar(50) not null check (length(trim(codigo_lote_pai)) > 0),
  produto_pai_id uuid not null references public.erp_produtos(id) on delete restrict,
  codigo_lote_filho varchar(50) not null check (length(trim(codigo_lote_filho)) > 0),
  produto_filho_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade_vinculada numeric(14, 4) not null check (quantidade_vinculada > 0),
  ordem_producao_id varchar(100),
  hash_verificacao varchar(100) not null,
  created_at timestamptz not null default now(),
  constraint erp_qualidade_genealogia_lotes_nao_auto_vinculo
    check (upper(trim(codigo_lote_pai)) <> upper(trim(codigo_lote_filho)))
);

create index if not exists ix_erp_qualidade_genealogia_empresa_data
  on public.erp_qualidade_genealogia_lotes (empresa_id, created_at desc);
create index if not exists ix_erp_qualidade_genealogia_lote_pai
  on public.erp_qualidade_genealogia_lotes (empresa_id, upper(codigo_lote_pai));
create index if not exists ix_erp_qualidade_genealogia_lote_filho
  on public.erp_qualidade_genealogia_lotes (empresa_id, upper(codigo_lote_filho));

alter table public.erp_qualidade_genealogia_lotes enable row level security;

drop policy if exists erp_qualidade_genealogia_select_tenant
  on public.erp_qualidade_genealogia_lotes;
create policy erp_qualidade_genealogia_select_tenant
  on public.erp_qualidade_genealogia_lotes
  for select to authenticated
  using (
    empresa_id = (select public.erp_current_empresa_id())
    or (select public.erp_is_master())
  );

drop policy if exists erp_qualidade_genealogia_insert_tenant
  on public.erp_qualidade_genealogia_lotes;
create policy erp_qualidade_genealogia_insert_tenant
  on public.erp_qualidade_genealogia_lotes
  for insert to authenticated
  with check (
    empresa_id = (select public.erp_current_empresa_id())
    and exists (
      select 1
      from public.erp_produtos pp
      where pp.id = produto_pai_id
        and pp.empresa_id = erp_qualidade_genealogia_lotes.empresa_id
    )
    and exists (
      select 1
      from public.erp_produtos pf
      where pf.id = produto_filho_id
        and pf.empresa_id = erp_qualidade_genealogia_lotes.empresa_id
    )
  );

revoke all on table public.erp_qualidade_genealogia_lotes from anon;
grant select, insert on table public.erp_qualidade_genealogia_lotes to authenticated;
