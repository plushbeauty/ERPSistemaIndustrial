-- MOLDPLÁS ERP INDUSTRIAL — liberação de lotes por empresa
-- Revisão: 2026-10-19. A migration cria a estrutura; não simula Git/Deploy nem gera hash criptográfico falso.
create table if not exists public.erp_qualidade_liberacao_lotes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  codigo_lote varchar(50) not null,
  produto_id uuid not null references public.erp_produtos(id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  status_sgq varchar(20) not null default 'QUARENTENA'
    check (status_sgq in ('APROVADO','REPROVADO','QUARENTENA')),
  responsavel_liberacao varchar(100) not null check (length(trim(responsavel_liberacao)) > 0),
  observacoes text,
  criado_por uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint erp_qualidade_liberacao_lotes_empresa_codigo_uq unique (empresa_id, codigo_lote)
);

create index if not exists erp_qualidade_liberacao_lotes_empresa_data_idx
  on public.erp_qualidade_liberacao_lotes (empresa_id, created_at desc);

alter table public.erp_qualidade_liberacao_lotes enable row level security;

drop policy if exists erp_qualidade_liberacao_lotes_select_tenant on public.erp_qualidade_liberacao_lotes;
create policy erp_qualidade_liberacao_lotes_select_tenant
  on public.erp_qualidade_liberacao_lotes for select to authenticated
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_qualidade_liberacao_lotes_insert_tenant on public.erp_qualidade_liberacao_lotes;
create policy erp_qualidade_liberacao_lotes_insert_tenant
  on public.erp_qualidade_liberacao_lotes for insert to authenticated
  with check (
    empresa_id = public.erp_current_empresa_id()
    and criado_por = auth.uid()
    and exists (
      select 1 from public.erp_produtos p
      where p.id = produto_id and p.empresa_id = public.erp_current_empresa_id() and p.ativo = true
    )
  );

drop policy if exists erp_qualidade_liberacao_lotes_update_tenant on public.erp_qualidade_liberacao_lotes;
create policy erp_qualidade_liberacao_lotes_update_tenant
  on public.erp_qualidade_liberacao_lotes for update to authenticated
  using (empresa_id = public.erp_current_empresa_id())
  with check (
    empresa_id = public.erp_current_empresa_id()
    and exists (
      select 1 from public.erp_produtos p
      where p.id = produto_id and p.empresa_id = public.erp_current_empresa_id() and p.ativo = true
    )
  );

grant select, insert, update on public.erp_qualidade_liberacao_lotes to authenticated;

create or replace function public.erp_qualidade_liberacao_lotes_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_erp_qualidade_liberacao_lotes_updated_at on public.erp_qualidade_liberacao_lotes;
create trigger trg_erp_qualidade_liberacao_lotes_updated_at
before update on public.erp_qualidade_liberacao_lotes
for each row execute function public.erp_qualidade_liberacao_lotes_touch_updated_at();
