create table if not exists public.erp_regras_fiscais (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 ncm text,
 cfop text,
 regime_empresa text,
 uf_destino text,
 icms_aliquota numeric(7,4) not null default 0,
 cst_csosn_icms text,
 ipi_aliquota numeric(7,4) not null default 0,
 cst_ipi text,
 pis_aliquota numeric(7,4) not null default 0,
 cofins_aliquota numeric(7,4) not null default 0,
 ativo boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.erp_regras_fiscais enable row level security;
drop policy if exists "erp_regras_fiscais_tenant" on public.erp_regras_fiscais;
create policy "erp_regras_fiscais_tenant" on public.erp_regras_fiscais
for all to authenticated
using ((empresa_id=public.erp_current_empresa_id()) or public.erp_is_master())
with check ((empresa_id=public.erp_current_empresa_id()) or public.erp_is_master());
grant select,insert,update,delete on public.erp_regras_fiscais to authenticated;
create index if not exists idx_erp_regras_fiscais_busca on public.erp_regras_fiscais(empresa_id,ncm,cfop,uf_destino,ativo);