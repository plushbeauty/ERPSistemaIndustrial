begin;

create table if not exists public.erp_qualidade_5s_auditorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  setor text not null check (length(trim(setor)) > 0),
  auditor text not null check (length(trim(auditor)) > 0),
  acompanhante text not null default '',
  seiri smallint not null check (seiri between 1 and 5),
  seiton smallint not null check (seiton between 1 and 5),
  seiso smallint not null check (seiso between 1 and 5),
  seiketsu smallint not null check (seiketsu between 1 and 5),
  shitsuke smallint not null check (shitsuke between 1 and 5),
  observacoes jsonb not null default '{}'::jsonb,
  status text not null default 'ENCERRADA' check (status in ('RASCUNHO', 'EM_ANDAMENTO', 'ENCERRADA')),
  created_at timestamptz not null default now()
);

create index if not exists erp_qualidade_5s_auditorias_empresa_created_idx
  on public.erp_qualidade_5s_auditorias (empresa_id, created_at desc);

alter table public.erp_qualidade_5s_auditorias enable row level security;

drop policy if exists erp_qualidade_5s_auditorias_tenant on public.erp_qualidade_5s_auditorias;
create policy erp_qualidade_5s_auditorias_tenant
  on public.erp_qualidade_5s_auditorias
  for all
  to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

grant select, insert, update, delete on public.erp_qualidade_5s_auditorias to authenticated;

commit;
