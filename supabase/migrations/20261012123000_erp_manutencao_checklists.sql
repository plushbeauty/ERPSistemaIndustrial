-- Checklist de manutenção preventiva persistido e isolado por empresa.
-- A migração é aditiva; não altera ordens, relatórios técnicos nem movimentos de estoque.
create table if not exists public.erp_manutencao_checklists (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  origem_cronograma text not null check (origem_cronograma in ('frp', 'master')),
  tag_fonte text not null,
  equipamento_fonte text not null,
  frequencia_fonte text not null,
  maquina_id uuid null references public.erp_maquinas(id) on delete set null,
  itens_concluidos jsonb not null default '[]'::jsonb
    check (jsonb_typeof(itens_concluidos) = 'array'),
  observacoes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null default auth.uid(),
  constraint erp_manutencao_checklists_empresa_origem_tag_key
    unique (empresa_id, origem_cronograma, tag_fonte)
);

create index if not exists idx_erp_manutencao_checklists_empresa
  on public.erp_manutencao_checklists (empresa_id, updated_at desc);

alter table public.erp_manutencao_checklists enable row level security;

drop policy if exists erp_manutencao_checklists_select on public.erp_manutencao_checklists;
create policy erp_manutencao_checklists_select
  on public.erp_manutencao_checklists for select to authenticated
  using (empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('manutencao', 'ver')));

drop policy if exists erp_manutencao_checklists_insert on public.erp_manutencao_checklists;
create policy erp_manutencao_checklists_insert
  on public.erp_manutencao_checklists for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('manutencao', 'editar'))
    and (maquina_id is null or exists (
      select 1 from public.erp_maquinas m
      where m.id = maquina_id and m.empresa_id = erp_manutencao_checklists.empresa_id
    )));

drop policy if exists erp_manutencao_checklists_update on public.erp_manutencao_checklists;
create policy erp_manutencao_checklists_update
  on public.erp_manutencao_checklists for update to authenticated
  using (empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('manutencao', 'editar')))
  with check (empresa_id = public.erp_current_empresa_id()
    and (public.erp_is_master() or public.erp_has_permission('manutencao', 'editar'))
    and (maquina_id is null or exists (
      select 1 from public.erp_maquinas m
      where m.id = maquina_id and m.empresa_id = erp_manutencao_checklists.empresa_id
    )));

revoke all on public.erp_manutencao_checklists from anon, public;
grant select, insert, update on public.erp_manutencao_checklists to authenticated;
