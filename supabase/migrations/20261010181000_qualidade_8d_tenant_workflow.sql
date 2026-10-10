begin;

create table if not exists public.erp_qualidade_8d (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete restrict,
  codigo text not null,
  rpnc_id uuid,
  etapa_atual text not null default 'D1',
  d1_equipe text,
  d2_problema text,
  d3_contencao text,
  d4_causa_raiz text,
  d5_acoes text,
  d6_validacao text,
  d7_preventivas text,
  d8_encerramento text,
  status text not null default 'EM_ANALISE',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_qualidade_8d_empresa_codigo_uq unique (empresa_id, codigo),
  constraint erp_qualidade_8d_etapa_ck check (etapa_atual in ('D1','D2','D3','D4','D5','D6','D7','D8')),
  constraint erp_qualidade_8d_status_ck check (status in ('EM_ANALISE','ACOES_EM_EXECUCAO','VALIDACAO','ENCERRADO')),
  constraint erp_qualidade_8d_empresa_rpnc_fk foreign key (empresa_id, rpnc_id)
    references public.erp_rpnc(empresa_id, id) on delete restrict
);

create index if not exists erp_qualidade_8d_empresa_status_idx
  on public.erp_qualidade_8d (empresa_id, status, updated_at desc);

alter table public.erp_qualidade_8d enable row level security;
drop policy if exists erp_qualidade_8d_tenant on public.erp_qualidade_8d;
create policy erp_qualidade_8d_tenant on public.erp_qualidade_8d
  for all to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (empresa_id = public.erp_current_empresa_id());

grant select, insert, update, delete on public.erp_qualidade_8d to authenticated;
revoke all on public.erp_qualidade_8d from anon;

commit;