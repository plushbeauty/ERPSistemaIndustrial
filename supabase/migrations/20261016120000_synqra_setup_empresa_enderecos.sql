begin;

alter table public.erp_empresas
  add column if not exists inscricao_estadual text,
  add column if not exists email_compras text;

create table if not exists public.erp_enderecos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  tipo text not null default 'MATRIZ' check (tipo in ('MATRIZ','FILIAL','COBRANCA','ENTREGA')),
  cep text not null,
  logradouro text not null,
  numero text not null,
  bairro text not null,
  cidade text not null,
  uf char(2) not null check (uf ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, tipo)
);

alter table public.erp_enderecos enable row level security;

drop policy if exists erp_enderecos_select_tenant on public.erp_enderecos;
create policy erp_enderecos_select_tenant
  on public.erp_enderecos for select to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master());

drop policy if exists erp_enderecos_insert_tenant on public.erp_enderecos;
create policy erp_enderecos_insert_tenant
  on public.erp_enderecos for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master());

drop policy if exists erp_enderecos_update_tenant on public.erp_enderecos;
create policy erp_enderecos_update_tenant
  on public.erp_enderecos for update to authenticated
  using (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master())
  with check (empresa_id = public.erp_current_empresa_id() or public.usuario_e_master());

grant select, insert, update on public.erp_enderecos to authenticated;

commit;
