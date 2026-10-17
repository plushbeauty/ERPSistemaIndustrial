-- Real per-user read receipts for controlled quality documents.
begin;

create unique index if not exists erp_documentos_qualidade_empresa_id_id_uq
  on public.erp_documentos_qualidade (empresa_id, id);
create unique index if not exists erp_usuarios_empresa_id_id_uq
  on public.erp_usuarios (empresa_id, id);

create table if not exists public.erp_documentos_qualidade_leituras (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null,
  documento_id uuid not null,
  revisao integer not null check (revisao > 0),
  usuario_id uuid not null,
  distribuido_em timestamptz not null default now(),
  lido_em timestamptz,
  created_at timestamptz not null default now(),
  constraint erp_doc_qual_leituras_empresa_doc_fkey
    foreign key (empresa_id, documento_id)
    references public.erp_documentos_qualidade (empresa_id, id)
    on delete cascade,
  constraint erp_doc_qual_leituras_empresa_user_fkey
    foreign key (empresa_id, usuario_id)
    references public.erp_usuarios (empresa_id, id)
    on delete cascade
);

create unique index if not exists erp_doc_qual_leituras_documento_revisao_usuario_uq
  on public.erp_documentos_qualidade_leituras (empresa_id, documento_id, revisao, usuario_id);
create index if not exists erp_doc_qual_leituras_pendentes_idx
  on public.erp_documentos_qualidade_leituras (empresa_id, usuario_id, lido_em);

alter table public.erp_documentos_qualidade_leituras enable row level security;

drop policy if exists erp_doc_qual_leituras_select_tenant on public.erp_documentos_qualidade_leituras;
create policy erp_doc_qual_leituras_select_tenant
  on public.erp_documentos_qualidade_leituras for select
  using (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_doc_qual_leituras_insert_tenant on public.erp_documentos_qualidade_leituras;
create policy erp_doc_qual_leituras_insert_tenant
  on public.erp_documentos_qualidade_leituras for insert
  with check (empresa_id = public.erp_current_empresa_id());

drop policy if exists erp_doc_qual_leituras_update_own on public.erp_documentos_qualidade_leituras;
create policy erp_doc_qual_leituras_update_own
  on public.erp_documentos_qualidade_leituras for update
  using (
    empresa_id = public.erp_current_empresa_id()
    and usuario_id = (
      select u.id from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = public.erp_current_empresa_id()
        and u.ativo = true
        and u.deleted_at is null
      limit 1
    )
  )
  with check (
    empresa_id = public.erp_current_empresa_id()
    and usuario_id = (
      select u.id from public.erp_usuarios u
      where u.auth_user_id = auth.uid()
        and u.empresa_id = public.erp_current_empresa_id()
        and u.ativo = true
        and u.deleted_at is null
      limit 1
    )
  );

revoke all on public.erp_documentos_qualidade_leituras from public, anon;
grant select, insert, update on public.erp_documentos_qualidade_leituras to authenticated;

notify pgrst, 'reload schema';
commit;
