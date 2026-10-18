begin;

create table if not exists public.erp_ajuda_suporte (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  usuario_id uuid references public.erp_usuarios(id) on delete set null,
  pergunta text not null check (length(btrim(pergunta)) > 0),
  resposta_gerada text not null check (length(btrim(resposta_gerada)) > 0),
  modulo_relacionado varchar(50) not null default 'Geral',
  created_at timestamptz not null default now()
);

create index if not exists idx_erp_ajuda_suporte_empresa_created
  on public.erp_ajuda_suporte (empresa_id, created_at desc);

alter table public.erp_ajuda_suporte enable row level security;

drop policy if exists erp_ajuda_suporte_tenant_select on public.erp_ajuda_suporte;
create policy erp_ajuda_suporte_tenant_select
  on public.erp_ajuda_suporte
  for select to authenticated
  using (empresa_id = (select public.erp_current_empresa_id()));

drop policy if exists erp_ajuda_suporte_tenant_insert on public.erp_ajuda_suporte;
create policy erp_ajuda_suporte_tenant_insert
  on public.erp_ajuda_suporte
  for insert to authenticated
  with check (
    empresa_id = (select public.erp_current_empresa_id())
    and exists (
      select 1
      from public.erp_usuarios u
      where u.id = erp_ajuda_suporte.usuario_id
        and u.auth_user_id = (select auth.uid())
        and u.empresa_id = (select public.erp_current_empresa_id())
        and u.ativo = true
        and u.deleted_at is null
    )
  );

revoke all on public.erp_ajuda_suporte from anon, authenticated;
grant select, insert on public.erp_ajuda_suporte to authenticated;

commit;
