create table if not exists public.erp_fmea (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 codigo text not null,
 processo text not null,
 etapa text,
 falha text not null,
 efeito text,
 causa text,
 controle text,
 severidade integer not null check(severidade between 1 and 10),
 ocorrencia integer not null check(ocorrencia between 1 and 10),
 deteccao integer not null check(deteccao between 1 and 10),
 rpn integer generated always as (severidade*ocorrencia*deteccao) stored,
 acao text,
 responsavel text,
 prazo date,
 status text not null default 'ABERTO',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(empresa_id,codigo)
);
create index if not exists idx_erp_fmea_empresa_rpn on public.erp_fmea(empresa_id,rpn desc);
alter table public.erp_fmea enable row level security;
drop policy if exists erp_fmea_tenant on public.erp_fmea;
create policy erp_fmea_tenant on public.erp_fmea for all to authenticated using(empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check(empresa_id=public.erp_current_empresa_id() or public.erp_is_master());