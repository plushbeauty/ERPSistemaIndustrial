begin;

-- GED de evidências vinculado ao modelo RPNC existente, com isolamento por empresa.
alter table public.erp_rpnc
  add column if not exists cliente_id uuid references public.erp_clientes(id) on delete set null,
  add column if not exists equipamento_codigo text;

create index if not exists erp_rpnc_empresa_cliente_idx
  on public.erp_rpnc (empresa_id, cliente_id, criado_em desc);

create table if not exists public.erp_qualidade_rpnc_evidencias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.erp_empresas(id) on delete cascade,
  rpnc_id uuid not null,
  nome_arquivo text not null check (length(trim(nome_arquivo)) > 0),
  storage_path text not null,
  mime_type text,
  tamanho_bytes bigint not null default 0 check (tamanho_bytes >= 0),
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  constraint erp_qualidade_rpnc_evidencias_rpnc_fk
    foreign key (empresa_id, rpnc_id)
    references public.erp_rpnc (empresa_id, id) on delete cascade,
  constraint erp_qualidade_rpnc_evidencias_storage_path_uq unique (storage_path)
);

create index if not exists erp_qualidade_rpnc_evidencias_rpnc_idx
  on public.erp_qualidade_rpnc_evidencias (empresa_id, rpnc_id, created_at desc);

alter table public.erp_qualidade_rpnc_evidencias enable row level security;

drop policy if exists erp_qualidade_rpnc_evidencias_select on public.erp_qualidade_rpnc_evidencias;
drop policy if exists erp_qualidade_rpnc_evidencias_insert on public.erp_qualidade_rpnc_evidencias;
drop policy if exists erp_qualidade_rpnc_evidencias_delete on public.erp_qualidade_rpnc_evidencias;

create policy erp_qualidade_rpnc_evidencias_select
  on public.erp_qualidade_rpnc_evidencias for select to authenticated
  using (empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('qualidade', 'ver'));

create policy erp_qualidade_rpnc_evidencias_insert
  on public.erp_qualidade_rpnc_evidencias for insert to authenticated
  with check (empresa_id = public.erp_current_empresa_id()
    and uploaded_by = auth.uid()
    and public.erp_has_permission('qualidade', 'editar'));

create policy erp_qualidade_rpnc_evidencias_delete
  on public.erp_qualidade_rpnc_evidencias for delete to authenticated
  using (empresa_id = public.erp_current_empresa_id()
    and public.erp_has_permission('qualidade', 'editar'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qualidade-evidencias', 'qualidade-evidencias', false, 26214400,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists qualidade_evidencias_select on storage.objects;
drop policy if exists qualidade_evidencias_insert on storage.objects;
drop policy if exists qualidade_evidencias_delete on storage.objects;

create policy qualidade_evidencias_select on storage.objects
  for select to authenticated using (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.id::text = (storage.foldername(name))[2]
        and r.empresa_id = public.erp_current_empresa_id()
        and public.erp_has_permission('qualidade', 'ver')
    )
  );

create policy qualidade_evidencias_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.id::text = (storage.foldername(name))[2]
        and r.empresa_id = public.erp_current_empresa_id()
        and public.erp_has_permission('qualidade', 'editar')
    )
  );

create policy qualidade_evidencias_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'qualidade-evidencias'
    and (storage.foldername(name))[1] = public.erp_current_empresa_id()::text
    and exists (
      select 1 from public.erp_rpnc r
      where r.id::text = (storage.foldername(name))[2]
        and r.empresa_id = public.erp_current_empresa_id()
        and public.erp_has_permission('qualidade', 'editar')
    )
  );

commit;
