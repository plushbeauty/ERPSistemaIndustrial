begin;
create unique index if not exists erp_rpnc_empresa_id_id_uq on public.erp_rpnc (empresa_id,id);
create table if not exists public.erp_qualidade_8d (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
 codigo text not null,
 rpnc_id uuid null,
 etapa_atual text not null default 'D1',
 d1_equipe text not null default '',
 d2_problema text not null default '',
 d3_contencao text not null default '',
 d4_causa_raiz text not null default '',
 d5_acoes text not null default '',
 d6_validacao text not null default '',
 d7_preventivas text not null default '',
 d8_encerramento text not null default '',
 status text not null default 'EM_ANALISE',
 criado_por uuid null references public.erp_usuarios(id) on delete set null,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now(),
 constraint erp_qualidade_8d_empresa_codigo_uq unique (empresa_id,codigo),
 constraint erp_qualidade_8d_etapa_ck check (etapa_atual in ('D1','D2','D3','D4','D5','D6','D7','D8')),
 constraint erp_qualidade_8d_status_ck check (status in ('EM_ANALISE','ACOES_EM_EXECUCAO','VALIDACAO','ENCERRADO')),
 constraint erp_qualidade_8d_empresa_rpnc_fk foreign key (empresa_id,rpnc_id) references public.erp_rpnc (empresa_id,id) on delete restrict
);
create index if not exists erp_qualidade_8d_empresa_status_idx on public.erp_qualidade_8d (empresa_id,status,atualizado_em desc);
alter table public.erp_qualidade_8d enable row level security;
alter table public.erp_qualidade_8d force row level security;
revoke all on public.erp_qualidade_8d from public,anon;
grant select,insert,update,delete on public.erp_qualidade_8d to authenticated;
drop policy if exists erp_qualidade_8d_tenant on public.erp_qualidade_8d;
create policy erp_qualidade_8d_tenant on public.erp_qualidade_8d for all to authenticated using (empresa_id=public.erp_current_empresa_id()) with check (empresa_id=public.erp_current_empresa_id());
commit;