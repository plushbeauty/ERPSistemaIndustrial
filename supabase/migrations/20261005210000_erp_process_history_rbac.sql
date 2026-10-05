-- Histórico dos processos industriais: rastreabilidade real por empresa e permissão.
create table if not exists public.erp_processos_historico (
  id uuid primary key default gen_random_uuid(), empresa_id uuid not null references public.erp_empresas(id),
  entidade text not null check (entidade in ('PROCESSO','FERRAMENTA','RECEITA')), entidade_id uuid not null,
  acao text not null, codigo text, descricao text, detalhes jsonb not null default '{}'::jsonb,
  usuario_id uuid, criado_em timestamptz not null default now()
);
create index if not exists idx_erp_processos_historico_empresa_data on public.erp_processos_historico(empresa_id, criado_em desc);
create index if not exists idx_erp_processos_historico_entidade on public.erp_processos_historico(empresa_id, entidade, entidade_id, criado_em desc);
alter table public.erp_processos_historico enable row level security;
drop policy if exists erp_processos_historico_select on public.erp_processos_historico;
create policy erp_processos_historico_select on public.erp_processos_historico for select to authenticated using ((select public.erp_is_master()) or (empresa_id=(select public.erp_current_empresa_id()) and (select public.erp_has_permission('producao.ver'))));
drop policy if exists erp_processos_historico_insert on public.erp_processos_historico;
create policy erp_processos_historico_insert on public.erp_processos_historico for insert to authenticated with check ((select public.erp_is_master()) or (empresa_id=(select public.erp_current_empresa_id()) and ((select public.erp_has_permission('producao.criar')) or (select public.erp_has_permission('producao.editar')))));
revoke update, delete on public.erp_processos_historico from authenticated;