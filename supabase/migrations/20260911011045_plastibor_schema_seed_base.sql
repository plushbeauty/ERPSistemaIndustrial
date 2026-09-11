create table if not exists public.erp_solicitacoes_compra (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  numero bigint not null,
  setor_solicitante_id uuid references public.erp_setores(id),
  solicitante_id uuid references public.erp_usuarios(id),
  descricao text not null,
  prioridade text not null default 'normal',
  requer_autorizacao boolean not null default true,
  status text not null default 'aguardando_autorizacao',
  autorizado_por uuid references public.erp_usuarios(id),
  autorizado_em timestamptz,
  recusado_por uuid references public.erp_usuarios(id),
  recusado_em timestamptz,
  email_destino text,
  pdf_storage_path text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_solicitacoes_compra_itens (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  solicitacao_id uuid not null references public.erp_solicitacoes_compra(id) on delete cascade,
  produto_id uuid references public.erp_produtos(id),
  descricao text not null,
  quantidade numeric not null default 1,
  unidade text not null default 'UN',
  valor_estimado numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_erp_solic_compra_empresa on public.erp_solicitacoes_compra(empresa_id,status);
create index if not exists idx_erp_solic_compra_itens_empresa on public.erp_solicitacoes_compra_itens(empresa_id,solicitacao_id);

alter table public.erp_solicitacoes_compra enable row level security;
alter table public.erp_solicitacoes_compra_itens enable row level security;

drop policy if exists tenant_select_solicitacoes_compra on public.erp_solicitacoes_compra;
drop policy if exists tenant_insert_solicitacoes_compra on public.erp_solicitacoes_compra;
drop policy if exists tenant_update_solicitacoes_compra on public.erp_solicitacoes_compra;
drop policy if exists tenant_delete_solicitacoes_compra on public.erp_solicitacoes_compra;
create policy tenant_select_solicitacoes_compra on public.erp_solicitacoes_compra for select to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy tenant_insert_solicitacoes_compra on public.erp_solicitacoes_compra for insert to authenticated with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy tenant_update_solicitacoes_compra on public.erp_solicitacoes_compra for update to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy tenant_delete_solicitacoes_compra on public.erp_solicitacoes_compra for delete to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

drop policy if exists tenant_select_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens;
drop policy if exists tenant_insert_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens;
drop policy if exists tenant_update_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens;
drop policy if exists tenant_delete_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens;
create policy tenant_select_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens for select to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy tenant_insert_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens for insert to authenticated with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy tenant_update_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens for update to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master()) with check (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());
create policy tenant_delete_solicitacoes_compra_itens on public.erp_solicitacoes_compra_itens for delete to authenticated using (empresa_id=public.erp_current_empresa_id() or public.erp_is_master());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('documentos-erp','documentos-erp',false,26214400,array['application/pdf','image/png','image/jpeg','image/webp','text/plain','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel'])
on conflict(id) do update set public=false,file_size_limit=26214400,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists tenant_documentos_erp_read on storage.objects;
drop policy if exists tenant_documentos_erp_insert on storage.objects;
drop policy if exists tenant_documentos_erp_update on storage.objects;
drop policy if exists tenant_documentos_erp_delete on storage.objects;
create policy tenant_documentos_erp_read on storage.objects for select to authenticated using (bucket_id='documentos-erp' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
create policy tenant_documentos_erp_insert on storage.objects for insert to authenticated with check (bucket_id='documentos-erp' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
create policy tenant_documentos_erp_update on storage.objects for update to authenticated using (bucket_id='documentos-erp' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text) with check (bucket_id='documentos-erp' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
create policy tenant_documentos_erp_delete on storage.objects for delete to authenticated using (bucket_id='documentos-erp' and (storage.foldername(name))[1]=public.erp_current_empresa_id()::text);
